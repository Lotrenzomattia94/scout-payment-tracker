import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Users, DollarSign, CreditCard, Banknote, AlertCircle, Check, X, Home, Settings, Wifi, WifiOff } from 'lucide-react';

// Configurazione Supabase
const SUPABASE_URL = 'https://tmmdcrjyjqnkeevcspwm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtbWRjcmp5anFua2VldmNzcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDA4OTgsImV4cCI6MjA2NjUxNjg5OH0.WjQbevq8xnrJjk4wFM1F7uU0OLUaiyxErkaFw8SvaVw';

// Client localStorage semplificato
class LocalStorageClient {
  async query(table, options = {}) {
    try {
      const data = JSON.parse(localStorage.getItem(table) || '[]');
      let result = [...data];
      
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          result = result.filter(item => item[key] == value);
        });
      }
      
      return result;
    } catch (error) {
      console.error(`LocalStorage Query Error for ${table}:`, error);
      return [];
    }
  }

  async insert(table, data) {
    try {
      const existing = JSON.parse(localStorage.getItem(table) || '[]');
      const newData = Array.isArray(data) ? data : [data];
      const withIds = newData.map(item => ({
        ...item,
        id: item.id || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      
      const updated = [...existing, ...withIds];
      localStorage.setItem(table, JSON.stringify(updated));
      return withIds;
    } catch (error) {
      console.error(`LocalStorage Insert Error for ${table}:`, error);
      throw error;
    }
  }

  async update(table, data, conditions) {
    try {
      const existing = JSON.parse(localStorage.getItem(table) || '[]');
      const updated = existing.map(item => {
        const matches = Object.entries(conditions).every(([key, value]) => item[key] == value);
        return matches ? { ...item, ...data } : item;
      });
      
      localStorage.setItem(table, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.error(`LocalStorage Update Error for ${table}:`, error);
      throw error;
    }
  }

  async delete(table, conditions) {
    try {
      const existing = JSON.parse(localStorage.getItem(table) || '[]');
      const filtered = existing.filter(item => {
        return !Object.entries(conditions).every(([key, value]) => item[key] == value);
      });
      
      localStorage.setItem(table, JSON.stringify(filtered));
      return filtered;
    } catch (error) {
      console.error(`LocalStorage Delete Error for ${table}:`, error);
      throw error;
    }
  }
}

// Client Supabase semplificato
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.headers = {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`
    };
  }

  async query(table, options = {}) {
    try {
      let url = `${this.url}/rest/v1/${table}`;
      const params = new URLSearchParams();
      
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          params.append(key, `eq.${value}`);
        });
      }
      
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`Query failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Supabase Query Error for ${table}:`, error);
      throw error;
    }
  }

  async insert(table, data) {
    try {
      const response = await fetch(`${this.url}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Insert failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Supabase Insert Error for ${table}:`, error);
      throw error;
    }
  }

  async update(table, data, conditions) {
    try {
      let url = `${this.url}/rest/v1/${table}`;
      const params = new URLSearchParams();
      
      Object.entries(conditions).forEach(([key, value]) => {
        params.append(key, `eq.${value}`);
      });
      
      url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...this.headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Supabase Update Error for ${table}:`, error);
      throw error;
    }
  }

  async delete(table, conditions) {
    try {
      let url = `${this.url}/rest/v1/${table}`;
      const params = new URLSearchParams();
      
      Object.entries(conditions).forEach(([key, value]) => {
        params.append(key, `eq.${value}`);
      });
      
      url += `?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.headers
      });
      
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }
      
      return [];
    } catch (error) {
      console.error(`Supabase Delete Error for ${table}:`, error);
      throw error;
    }
  }
}

const ScoutPaymentApp = () => {
  // Basic states
  const [activeTab, setActiveTab] = useState('dashboard');
  const [scouts, setScouts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [extraIncomes, setExtraIncomes] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);
  
  // Group management - simplified initialization
  const [groupId, setGroupId] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [showGroupSetup, setShowGroupSetup] = useState(true);
  
  // Modals
  const [showAddScout, setShowAddScout] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddAdvance, setShowAddAdvance] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);

  // Initialize group data on mount
  useEffect(() => {
    try {
      const savedGroupId = localStorage.getItem('groupId');
      const savedGroupName = localStorage.getItem('groupName');
      
      if (savedGroupId) {
        setGroupId(savedGroupId);
        setGroupName(savedGroupName || '');
        setShowGroupSetup(false);
      }
    } catch (error) {
      console.error('Error loading group data:', error);
    }
  }, []);

  // Determine database type
  const useLocalStorage = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.includes('claude.ai');

  // Database client
  const db = useLocalStorage 
    ? new LocalStorageClient() 
    : new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Debug helper
  const addDebugInfo = useCallback((message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
    console.log(`DEBUG: ${message}`);
  }, []);

  // Monitor connection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addDebugInfo('Connection restored');
    };
    const handleOffline = () => {
      setIsOnline(false);
      addDebugInfo('Connection lost');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    addDebugInfo(`App initialized - Using ${useLocalStorage ? 'LocalStorage' : 'Supabase'}`);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [addDebugInfo, useLocalStorage]);

  // Load data from database
  const loadData = useCallback(async () => {
    if (!groupId) {
      addDebugInfo('No groupId, skipping data load');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    addDebugInfo(`Loading data for group: ${groupId}`);
    
    try {
      const [scoutsData, expensesData, advancesData, incomesData] = await Promise.all([
        db.query('scouts', { eq: { group_id: groupId } }).catch(e => {
          addDebugInfo(`Scouts query failed: ${e.message}`);
          return [];
        }),
        db.query('expenses', { eq: { group_id: groupId } }).catch(e => {
          addDebugInfo(`Expenses query failed: ${e.message}`);
          return [];
        }),
        db.query('advances', { eq: { group_id: groupId } }).catch(e => {
          addDebugInfo(`Advances query failed: ${e.message}`);
          return [];
        }),
        db.query('extra_incomes', { eq: { group_id: groupId } }).catch(e => {
          addDebugInfo(`Extra incomes query failed: ${e.message}`);
          return [];
        })
      ]);

      setScouts(scoutsData || []);
      setExpenses(expensesData || []);
      setAdvances(advancesData || []);
      setExtraIncomes(incomesData || []);
      
      addDebugInfo(`Data loaded: ${scoutsData.length} scouts, ${expensesData.length} expenses`);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(`Errore caricamento dati: ${error.message}`);
      addDebugInfo(`Data loading failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, db, addDebugInfo]);

  useEffect(() => {
    if (groupId) {
      loadData();
    }
  }, [groupId, loadData]);

  // Setup group
  const setupGroup = async (name, code = null) => {
    setIsLoading(true);
    setError(null);
    addDebugInfo(`Setting up group: ${code ? 'joining' : 'creating'}`);
    
    try {
      if (code) {
        // Join existing group
        const groups = await db.query('groups', { eq: { access_code: code } });
        if (groups.length === 0) {
          throw new Error('Codice gruppo non valido');
        }
        const group = groups[0];
        setGroupId(group.id);
        setGroupName(group.name);
        localStorage.setItem('groupId', group.id);
        localStorage.setItem('groupName', group.name);
        addDebugInfo(`Joined group: ${group.name}`);
      } else {
        // Create new group
        const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const groupData = {
          name,
          access_code: accessCode,
          created_at: new Date().toISOString()
        };
        
        const newGroup = await db.insert('groups', groupData);
        const group = newGroup[0];
        setGroupId(group.id);
        setGroupName(group.name);
        localStorage.setItem('groupId', group.id);
        localStorage.setItem('groupName', group.name);
        
        addDebugInfo(`Created group: ${group.name} - Code: ${accessCode}`);
        
        alert(`Gruppo creato! Codice di accesso: ${accessCode}\n\n${
          useLocalStorage 
            ? 'NOTA: In modalità locale, il codice funziona solo su questo browser.' 
            : 'Condividi questo codice con gli altri capi!'
        }`);
      }
      setShowGroupSetup(false);
    } catch (error) {
      console.error('Group setup error:', error);
      setError(`Errore configurazione gruppo: ${error.message}`);
      addDebugInfo(`Group setup failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate financial totals
  const calculateTotals = () => {
    let bankTotal = 0;
    let cashTotal = 0;
    
    // Sum extra incomes
    extraIncomes.forEach(income => {
      if (income.method === 'bonifico') {
        bankTotal += income.amount;
      } else {
        cashTotal += income.amount;
      }
    });
    
    // Subtract expenses
    expenses.forEach(expense => {
      if (expense.method === 'bonifico') {
        bankTotal -= expense.amount;
      } else {
        cashTotal -= expense.amount;
      }
    });
    
    // Subtract unreimbursed advances
    advances.forEach(advance => {
      if (!advance.reimbursed) {
        if (advance.method === 'bonifico') {
          bankTotal -= advance.amount;
        } else {
          cashTotal -= advance.amount;
        }
      }
    });
    
    return { bankTotal, cashTotal, total: bankTotal + cashTotal };
  };

  // CRUD Operations
  const addScout = async (scoutData) => {
    addDebugInfo(`Adding scout: ${scoutData.name} ${scoutData.surname}`);
    
    const newScout = {
      ...scoutData,
      group_id: groupId,
      created_at: new Date().toISOString()
    };
    
    try {
      const result = await db.insert('scouts', newScout);
      setScouts([...scouts, result[0]]);
      setShowAddScout(false);
      addDebugInfo(`Scout added successfully`);
    } catch (error) {
      console.error('Error adding scout:', error);
      setError(`Errore aggiunta scout: ${error.message}`);
      addDebugInfo(`Add scout failed: ${error.message}`);
    }
  };

  const addExpense = async (expenseData) => {
    addDebugInfo(`Adding expense: ${expenseData.description}`);
    
    const expense = {
      ...expenseData,
      group_id: groupId,
      amount: parseFloat(expenseData.amount),
      date: new Date().toISOString().split('T')[0]
    };
    
    try {
      const result = await db.insert('expenses', expense);
      setExpenses([...expenses, result[0]]);
      setShowAddExpense(false);
      addDebugInfo(`Expense added successfully`);
    } catch (error) {
      console.error('Error adding expense:', error);
      setError(`Errore aggiunta spesa: ${error.message}`);
      addDebugInfo(`Add expense failed: ${error.message}`);
    }
  };

  const addExtraIncome = async (incomeData) => {
    addDebugInfo(`Adding extra income: ${incomeData.description}`);
    
    const income = {
      ...incomeData,
      group_id: groupId,
      amount: parseFloat(incomeData.amount),
      date: new Date().toISOString().split('T')[0]
    };
    
    try {
      const result = await db.insert('extra_incomes', income);
      setExtraIncomes([...extraIncomes, result[0]]);
      setShowAddIncome(false);
      addDebugInfo(`Extra income added successfully`);
    } catch (error) {
      console.error('Error adding extra income:', error);
      setError(`Errore aggiunta entrata: ${error.message}`);
      addDebugInfo(`Add extra income failed: ${error.message}`);
    }
  };

  const addAdvance = async (advanceData) => {
    addDebugInfo(`Adding advance: ${advanceData.leader}`);
    
    const advance = {
      ...advanceData,
      group_id: groupId,
      amount: parseFloat(advanceData.amount),
      reimbursed: false,
      date: new Date().toISOString().split('T')[0]
    };
    
    try {
      const result = await db.insert('advances', advance);
      setAdvances([...advances, result[0]]);
      setShowAddAdvance(false);
      addDebugInfo(`Advance added successfully`);
    } catch (error) {
      console.error('Error adding advance:', error);
      setError(`Errore aggiunta anticipo: ${error.message}`);
      addDebugInfo(`Add advance failed: ${error.message}`);
    }
  };

  const deleteExpense = async (expenseId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa spesa?')) return;
    
    addDebugInfo(`Deleting expense: ${expenseId}`);
    
    try {
      await db.delete('expenses', { id: expenseId });
      setExpenses(expenses.filter(expense => expense.id !== expenseId));
      addDebugInfo(`Expense deleted successfully`);
    } catch (error) {
      console.error('Error deleting expense:', error);
      setError(`Errore eliminazione spesa: ${error.message}`);
      addDebugInfo(`Delete expense failed: ${error.message}`);
    }
  };

  const totals = calculateTotals();

  // Debug Panel Component
  const DebugPanel = () => (
    <div className="bg-gray-900 text-green-400 p-3 text-xs font-mono max-h-32 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-white font-bold text-sm">🐛 DEBUG LOG</span>
        <button 
          onClick={() => setDebugInfo([])}
          className="text-red-400 hover:text-red-300 text-xs"
        >
          Clear
        </button>
      </div>
      {debugInfo.length > 0 ? debugInfo.map((info, index) => (
        <div key={index} className="mb-1">{info}</div>
      )) : (
        <div className="text-gray-600">No debug messages</div>
      )}
    </div>
  );
};

export default ScoutPaymentApp;

  // Group Setup Modal
  const GroupSetupModal = () => {
    const [mode, setMode] = useState('create');
    const [name, setName] = useState('');
    const [code, setCode] = useState('');

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">Configura Gruppo Scout</h2>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-2 px-4 rounded ${mode === 'create' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Crea Gruppo
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 py-2 px-4 rounded ${mode === 'join' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              Unisciti
            </button>
          </div>

          {mode === 'create' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome Gruppo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="es. Scout Gruppo Roma 12"
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <button
                onClick={() => setupGroup(name)}
                disabled={!name || isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Creazione...' : 'Crea Gruppo'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Codice Gruppo</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="es. ABC123"
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <button
                onClick={() => setupGroup('', code)}
                disabled={!code || isLoading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? 'Accesso...' : 'Unisciti al Gruppo'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Setup iniziale
  if (showGroupSetup) {
    return (
      <div>
        <GroupSetupModal />
        <DebugPanel />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Scout Payment Tracker</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
              {groupName}
            </div>
            <button
              onClick={() => setShowGroupSetup(true)}
              className="p-2 hover:bg-blue-700 rounded"
              title="Cambia gruppo"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {useLocalStorage && (
        <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2 text-yellow-800 text-sm">
          ℹ️ Modalità Locale - Dati salvati nel browser
        </div>
      )}

      {!useLocalStorage && (
        <div className="bg-green-100 border-b border-green-200 px-4 py-2 text-green-800 text-sm">
          🌐 Modalità Cloud - Sincronizzazione Supabase
        </div>
      )}

      {isLoading && (
        <div className="bg-blue-100 border-b border-blue-200 px-4 py-2 text-blue-800 text-sm">
          🔄 Operazione in corso...
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-b border-red-200 px-4 py-2 text-red-800 text-sm flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button 
            onClick={() => setError(null)} 
            className="text-red-600 hover:text-red-800 ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Debug Panel */}
      <DebugPanel />

      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex overflow-x-auto">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard' },
            { id: 'scouts', icon: Users, label: `Scout (${scouts.length})` },
            { id: 'incomes', icon: Plus, label: `Entrate (${extraIncomes.length})` },
            { id: 'expenses', icon: CreditCard, label: `Spese (${expenses.length})` },
            { id: 'advances', icon: AlertCircle, label: `Anticipi (${advances.filter(a => !a.reimbursed).length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap border-b-2 transition-colors font-medium ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={20} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Conto Corrente</p>
                    <p className="text-2xl font-bold text-blue-600">€{totals.bankTotal.toFixed(2)}</p>
                  </div>
                  <CreditCard className="text-blue-600" size={32} />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Cassa Contanti</p>
                    <p className="text-2xl font-bold text-green-600">€{totals.cashTotal.toFixed(2)}</p>
                  </div>
                  <Banknote className="text-green-600" size={32} />
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Totale Disponibile</p>
                    <p className="text-2xl font-bold text-purple-600">€{totals.total.toFixed(2)}</p>
                  </div>
                  <DollarSign className="text-purple-600" size={32} />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Azioni Rapide</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => setShowAddScout(true)}
                  className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                >
                  <Users size={20} />
                  <span className="text-sm font-medium">Nuovo Scout</span>
                </button>
                <button
                  onClick={() => setShowAddIncome(true)}
                  className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
                >
                  <Plus size={20} />
                  <span className="text-sm font-medium">Nuova Entrata</span>
                </button>
                <button
                  onClick={() => setShowAddExpense(true)}
                  className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                >
                  <CreditCard size={20} />
                  <span className="text-sm font-medium">Nuova Spesa</span>
                </button>
                <button
                  onClick={() => setShowAddAdvance(true)}
                  className="flex items-center gap-2 p-3 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100"
                >
                  <AlertCircle size={20} />
                  <span className="text-sm font-medium">Nuovo Anticipo</span>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="text-lg font-semibold mb-4">Statistiche</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{scouts.length}</p>
                  <p className="text-sm text-gray-600">Scout Registrati</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">€{expenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Spese Totali</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">€{extraIncomes.reduce((sum, income) => sum + income.amount, 0).toFixed(2)}</p>
                  <p className="text-sm text-gray-600">Entrate Extra</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">{advances.filter(advance => !advance.reimbursed).length}</p>
                  <p className="text-sm text-gray-600">Anticipi Attivi</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scouts' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gestione Scout</h2>
              <button
                onClick={() => setShowAddScout(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus size={18} />
                Aggiungi Scout
              </button>
            </div>

            <div className="grid gap-4">
              {scouts.map(scout => (
                <div key={scout.id} className="bg-white p-6 rounded-lg shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{scout.name} {scout.surname}</h3>
                      <p className="text-sm text-gray-600">
                        {scout.section} {scout.has_siblings && '• Ha fratelli nel gruppo'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        Registrato
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {scouts.length === 0 && (
                <div className="bg-white p-8 rounded-lg shadow-sm border text-center text-gray-500">
                  Nessuno scout registrato. Aggiungi il primo scout!
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'incomes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Entrate Extra</h2>
              <button
                onClick={() => setShowAddIncome(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
              >
                <Plus size={18} />
                Aggiungi Entrata
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Data</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Descrizione</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Categoria</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Importo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Metodo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {extraIncomes.map(income => (
                      <tr key={income.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(income.date).toLocaleDateString('it-IT')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{income.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                          {income.category || 'Non specificata'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-green-600">
                          +€{income.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            income.method === 'bonifico' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {income.method === 'bonifico' ? <CreditCard size={12} /> : <Banknote size={12} />}
                            {income.method}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {extraIncomes.length === 0 && (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                          Nessuna entrata extra registrata
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gestione Spese</h2>
              <button
                onClick={() => setShowAddExpense(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center gap-2"
              >
                <Plus size={18} />
                Aggiungi Spesa
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Data</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Descrizione</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Categoria</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Importo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Metodo</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Azioni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {expenses.map(expense => (
                      <tr key={expense.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(expense.date).toLocaleDateString('it-IT')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{expense.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                          {expense.category || 'Non specificata'}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-red-600">
                          -€{expense.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            expense.method === 'bonifico' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {expense.method === 'bonifico' ? <CreditCard size={12} /> : <Banknote size={12} />}
                            {expense.method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Elimina"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                          Nessuna spesa registrata
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'advances' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Anticipi Capi</h2>
              <button
                onClick={() => setShowAddAdvance(true)}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 flex items-center gap-2"
              >
                <Plus size={18} />
                Aggiungi Anticipo
              </button>
            </div>

            <div className="grid gap-4">
              {advances.map(advance => (
                <div key={advance.id} className={`bg-white p-4 rounded-lg shadow-sm border ${advance.reimbursed ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{advance.leader}</h3>
                        {advance.reimbursed && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                            Rimborsato
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{advance.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Data: {new Date(advance.date).toLocaleDateString('it-IT')}</span>
                        <span className="flex items-center gap-1">
                          {advance.method === 'bonifico' ? <CreditCard size={14} /> : <Banknote size={14} />}
                          {advance.method}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-orange-600">€{advance.amount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {advances.length === 0 && (
                <div className="bg-white p-8 rounded-lg shadow-sm border text-center text-gray-500">
                  Nessun anticipo registrato
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddScout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Aggiungi Scout</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addScout({
                name: formData.get('name'),
                surname: formData.get('surname'),
                section: formData.get('section'),
                has_siblings: formData.get('has_siblings') === 'on'
              });
            }} className="space-y-4">
              <input name="name" placeholder="Nome" className="w-full p-2 border rounded" required />
              <input name="surname" placeholder="Cognome" className="w-full p-2 border rounded" required />
              <select name="section" className="w-full p-2 border rounded" required>
                <option value="">Seleziona sezione</option>
                <option value="Lupetti">Lupetti</option>
                <option value="Reparto">Reparto</option>
                <option value="Clan">Clan</option>
              </select>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="has_siblings" />
                <span className="text-sm">Ha fratelli nel gruppo</span>
              </label>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                  Aggiungi
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddScout(false)}
                  className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddIncome && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Aggiungi Entrata Extra</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addExtraIncome({
                description: formData.get('description'),
                amount: parseFloat(formData.get('amount')),
                method: formData.get('method'),
                category: formData.get('category')
              });
            }} className="space-y-4">
              <input name="description" placeholder="Descrizione entrata" className="w-full p-2 border rounded" required />
              <input name="amount" type="number" step="0.01" placeholder="Importo" className="w-full p-2 border rounded" required />
              <select name="method" className="w-full p-2 border rounded" required>
                <option value="contanti">Contanti</option>
                <option value="bonifico">Bonifico</option>
              </select>
              <select name="category" className="w-full p-2 border rounded">
                <option value="">Categoria</option>
                <option value="donazione">Donazione</option>
                <option value="vendita">Vendita</option>
                <option value="fundraising">Fundraising</option>
                <option value="altro">Altro</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700">
                  Aggiungi
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddIncome(false)}
                  className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Aggiungi Spesa</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addExpense({
                description: formData.get('description'),
                amount: parseFloat(formData.get('amount')),
                method: formData.get('method'),
                category: formData.get('category')
              });
            }} className="space-y-4">
              <input name="description" placeholder="Descrizione spesa" className="w-full p-2 border rounded" required />
              <input name="amount" type="number" step="0.01" placeholder="Importo" className="w-full p-2 border rounded" required />
              <select name="method" className="w-full p-2 border rounded" required>
                <option value="contanti">Contanti</option>
                <option value="bonifico">Bonifico</option>
              </select>
              <select name="category" className="w-full p-2 border rounded">
                <option value="">Categoria</option>
                <option value="attivita">Attività</option>
                <option value="materiali">Materiali</option>
                <option value="campo">Campo</option>
                <option value="altro">Altro</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-red-600 text-white py-2 rounded hover:bg-red-700">
                  Aggiungi
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddAdvance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Aggiungi Anticipo Capo</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              addAdvance({
                leader: formData.get('leader'),
                description: formData.get('description'),
                amount: parseFloat(formData.get('amount')),
                method: formData.get('method')
              });
            }} className="space-y-4">
              <input name="leader" placeholder="Nome capo" className="w-full p-2 border rounded" required />
              <input name="description" placeholder="Descrizione anticipo" className="w-full p-2 border rounded" required />
              <input name="amount" type="number" step="0.01" placeholder="Importo" className="w-full p-2 border rounded" required />
              <select name="method" className="w-full p-2 border rounded" required>
                <option value="contanti">Contanti Propri</option>
                <option value="bonifico">Conto Proprio</option>
              </select>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-orange-600 text-white py-2 rounded hover:bg-orange-700">
                  Aggiungi
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddAdvance(false)}
                  className="flex-1 bg-gray-300 py-2 rounded hover:bg-gray-400"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
