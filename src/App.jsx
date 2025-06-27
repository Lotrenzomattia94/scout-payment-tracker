import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Users, DollarSign, CreditCard, Banknote, AlertCircle, Check, X, Home, Settings, Wifi, WifiOff } from 'lucide-react';

// Configurazione Supabase
const SUPABASE_URL = 'https://tmmdcrjyjqnkeevcspwm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtbWRjcmp5anFua2VldmNzcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDA4OTgsImV4cCI6MjA2NjUxNjg5OH0.WjQbevq8xnrJjk4wFM1F7uU0OLUaiyxErkaFw8SvaVw';

// Client localStorage migliorato
class LocalStorageClient {
  constructor() {
    this.isLocalStorage = true;
  }

  async query(table, options = {}) {
    try {
      const data = JSON.parse(localStorage.getItem(table) || '[]');
      let result = [...data];
      
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          result = result.filter(item => item[key] == value);
        });
      }
      
      console.log(`LocalStorage Query ${table}:`, result);
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
      console.log(`LocalStorage Insert ${table}:`, withIds);
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
      console.log(`LocalStorage Update ${table}:`, updated);
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
      console.log(`LocalStorage Delete ${table}:`, filtered);
      return filtered;
    } catch (error) {
      console.error(`LocalStorage Delete Error for ${table}:`, error);
      throw error;
    }
  }
}

// Client Supabase migliorato con debug
class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.headers = {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`
    };
    this.isLocalStorage = false;
  }

  async testConnection() {
    try {
      const response = await fetch(`${this.url}/rest/v1/`, {
        method: 'GET',
        headers: this.headers
      });
      return response.ok;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }

  async query(table, options = {}) {
    try {
      let url = `${this.url}/rest/v1/${table}`;
      const params = new URLSearchParams();
      
      if (options.select) params.append('select', options.select);
      if (options.eq) {
        Object.entries(options.eq).forEach(([key, value]) => {
          params.append(key, `eq.${value}`);
        });
      }
      if (options.order) params.append('order', options.order);
      
      if (params.toString()) url += `?${params.toString()}`;
      
      console.log(`Supabase Query URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Supabase Query Error:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Query failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`Supabase Query ${table} Result:`, result);
      return result;
    } catch (error) {
      console.error(`Supabase Query Error for ${table}:`, error);
      throw error;
    }
  }

  async insert(table, data) {
    try {
      console.log(`Supabase Insert ${table}:`, data);
      
      const response = await fetch(`${this.url}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Supabase Insert Error:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Insert failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`Supabase Insert ${table} Result:`, result);
      return result;
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
      
      console.log(`Supabase Update ${table}:`, { url, data });
      
      const response = await fetch(url, {
        method: 'PATCH',
        headers: {
          ...this.headers,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Supabase Update Error:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Update failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`Supabase Update ${table} Result:`, result);
      return result;
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
      
      console.log(`Supabase Delete ${table}:`, url);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Supabase Delete Error:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        throw new Error(`Delete failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      console.log(`Supabase Delete ${table} Success`);
      return [];
    } catch (error) {
      console.error(`Supabase Delete Error for ${table}:`, error);
      throw error;
    }
  }
}

const ScoutPaymentApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [scouts, setScouts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [extraIncomes, setExtraIncomes] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState([]);
  
  // Group management
  const [groupId, setGroupId] = useState(() => {
    try {
      return localStorage.getItem('groupId');
    } catch {
      return null;
    }
  });
  const [groupName, setGroupName] = useState(() => {
    try {
      return localStorage.getItem('groupName') || '';
    } catch {
      return '';
    }
  });
  const [showGroupSetup, setShowGroupSetup] = useState(!groupId);
  
  // Modals
  const [showAddScout, setShowAddScout] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddAdvance, setShowAddAdvance] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);

  // Determine if we should use localStorage
  const useLocalStorage = useMemo(() => {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname.includes('claude.ai');
  }, []);

  // Initialize database client
  const db = useMemo(() => {
    const client = useLocalStorage 
      ? new LocalStorageClient() 
      : new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    addDebugInfo(`Database client initialized: ${useLocalStorage ? 'LocalStorage' : 'Supabase'}`);
    return client;
  }, [useLocalStorage]);

  // Debug helper
  const addDebugInfo = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo(prev => [...prev.slice(-9), `${timestamp}: ${message}`]);
    console.log(`DEBUG: ${message}`);
  };

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
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Test Supabase connection
  useEffect(() => {
    if (!useLocalStorage && db) {
      db.testConnection().then(connected => {
        addDebugInfo(`Supabase connection test: ${connected ? 'SUCCESS' : 'FAILED'}`);
      });
    }
  }, [db, useLocalStorage]);

  // Load data from database
  const loadData = async () => {
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
      
      addDebugInfo(`Data loaded: ${scoutsData.length} scouts, ${expensesData.length} expenses, ${advancesData.length} advances, ${incomesData.length} incomes`);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(`Errore caricamento dati: ${error.message}`);
      addDebugInfo(`Data loading failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      loadData();
    }
  }, [groupId, db]);

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
        addDebugInfo(`Joined group: ${group.name} (${group.id})`);
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
        
        addDebugInfo(`Created group: ${group.name} (${group.id}) - Code: ${accessCode}`);
        
        alert(`Gruppo creato! Codice di accesso: ${accessCode}\n\n${
          useLocalStorage 
            ? 'NOTA: In modalità locale, il codice funziona solo su questo browser.' 
            : 'Condividi questo codice con gli altri capi per accedere al gruppo!'
        }`);
      }
      setShowGroupSetup(false);
    } catch (error) {
      console.error('Group setup error:', error);
      setError(`Errore durante la configurazione del gruppo: ${error.message}`);
      addDebugInfo(`Group setup failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate financial totals
  const calculateTotals = () => {
    let bankTotal = 0;
    let cashTotal = 0;
    
    // Sum scout payments
    scouts.forEach(scout => {
      if (scout.payments) {
        scout.payments.forEach(payment => {
          if (payment.method === 'bonifico') {
            bankTotal += payment.amount;
          } else {
            cashTotal += payment.amount;
          }
        });
      }
    });
    
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

  const getScoutDues = (scout) => {
    const hasSiblings = scout.has_siblings;
    const monthlyRate = hasSiblings ? 20 : 25;
    const campFee = hasSiblings ? 185 : 200;
    const insuranceFee = hasSiblings ? 55 : 70;
    
    const totalMonthly = monthlyRate * 9;
    const totalDue = totalMonthly + campFee + insuranceFee;
    
    const payments = scout.payments || [];
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = totalDue - totalPaid;
    
    const monthlyPayments = payments.filter(p => p.type === 'monthly');
    const allMonths = ['Ottobre', 'Novembre', 'Dicembre', 'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno'];
    const paidMonths = monthlyPayments.map(p => p.month).filter(Boolean);
    const missingMonths = allMonths.filter(month => !paidMonths.includes(month));
    
    return {
      monthlyRate,
      totalMonthly,
      campFee,
      insuranceFee,
      totalDue,
      totalPaid,
      remaining,
      missingMonths
    };
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
      setScouts([...scouts, { ...result[0], payments: [] }]);
      setShowAddScout(false);
      addDebugInfo(`Scout added successfully`);
    } catch (error) {
      console.error('Error adding scout:', error);
      setError(`Errore aggiunta scout: ${error.message}`);
      addDebugInfo(`Add scout failed: ${error.message}`);
    }
  };

  const addExpense = async (expenseData) => {
    addDebugInfo(`Adding expense: ${expenseData.description} - €${expenseData.amount}`);
    
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
    addDebugInfo(`Adding extra income: ${incomeData.description} - €${incomeData.amount}`);
    
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
    addDebugInfo(`Adding advance: ${advanceData.leader} - €${advanceData.amount}`);
    
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

  const markAdvanceAsReimbursed = async (advanceId) => {
    addDebugInfo(`Marking advance as reimbursed: ${advanceId}`);
    
    try {
      await db.update('advances', { reimbursed: true }, { id: advanceId });
      setAdvances(advances.map(advance => 
        advance.id === advanceId ? { ...advance, reimbursed: true } : advance
      ));
      addDebugInfo(`Advance reimbursed successfully`);
    } catch (error) {
      console.error('Error reimbursing advance:', error);
      setError(`Errore rimborso anticipo: ${error.message}`);
      addDebugInfo(`Reimburse advance failed: ${error.message}`);
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

  const deleteAdvance = async (advanceId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo anticipo?')) return;
    
    addDebugInfo(`Deleting advance: ${advanceId}`);
    
    try {
      await db.delete('advances', { id: advanceId });
      setAdvances(advances.filter(advance => advance.id !== advanceId));
      addDebugInfo(`Advance deleted successfully`);
    } catch (error) {
      console.error('Error deleting advance:', error);
      setError(`Errore eliminazione anticipo: ${error.message}`);
      addDebugInfo(`Delete advance failed: ${error.message}`);
    }
  };

  const totals = calculateTotals();

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

  // Debug Panel
  const DebugPanel = () => (
    <div className="bg-gray-900 text-green-400 p-4 text-xs font-mono max-h-40 overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-white font-bold">DEBUG LOG</span>
        <button 
          onClick={() => setDebugInfo([])}
          className="text-red-400 hover:text-red-300"
        >
          Clear
        </button>
      </div>
      {debugInfo.map((info, index) => (
        <div key={index} className="mb-1">{info}</div>
      ))}
      {debugInfo.length === 0 && (
        <div className="text-gray-600">No debug messages</div>
      )}
    </div>
  );

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

      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap border-b-2 transition-colors font-medium ${
              activeTab === 'dashboard'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <Home size={20} />
            Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab('scouts')}
            className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap border-b-2 transition-colors font-medium ${
              activeTab === 'scouts'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <Users size={20} />
            Scout ({scouts.length})
          </button>
          
          <button
            onClick={() => setActiveTab('incomes')}
            className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap border-b-2 transition-colors font-medium ${
              activeTab === 'incomes'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <Plus size={20} />
            Entrate ({extraIncomes.length})
          </button>
          
          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap border-b-2 transition-colors font-medium ${
              activeTab === 'expenses'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <CreditCard size={20} />
            Spese ({expenses.length})
          </button>
          
          <button
            onClick={() => setActiveTab('advances')}
            className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap border-b-2 transition-colors font-medium ${
              activeTab === 'advances'
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-600 hover:text-blue-600 hover:bg-gray-50'
            }`}
          >
            <AlertCircle size={20} />
            Anticipi ({advances.filter(a => !a.reimbursed).length})
          </button>
        </div>
      </div>

      {/* Status Bar */}
      {useLocalStorage && (
        <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2 text-yellow-800 text-sm">
          ℹ️ Modalità Locale - Per il multi-dispositivo usa la versione online
        </div>
      )}

      {!useLocalStorage && isOnline && (
        <div className="bg-green-100 border-b border-green-200 px-4 py-2 text-green-800 text-sm">
          🌐 Modalità Cloud - Dati sincronizzati tra tutti i dispositivi
        </div>
      )}

      {!isOnline && (
        <div className="bg-red-100 border-b border-red-200 px-4 py-2 text-red-800 text-sm">
          ⚠️ Modalità offline - Connessione internet non disponibile
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
          <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">×</button>
        </div>
      )}

      {/* Debug Panel */}
      <DebugPanel />

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

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Situazione Pagamenti</h3>
                <div className="space-y-2">
                  {scouts.length > 0 ? (
                    scouts.slice(0, 5).map(scout => {
                      const dues = getScoutDues(scout);
                      return (
                        <div key={scout.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                          <span className="text-sm">{scout.name} {scout.surname}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${dues.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              €{Math.abs(dues.remaining).toFixed(2)}
                            </span>
                            {dues.remaining <= 0 ? <Check size={16} className="text-green-600" /> : <X size={16} className="text-red-600" />}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-sm">Nessuno scout registrato. Aggiungi il primo scout!</p>
                  )}
                  {scouts.length > 5 && (
                    <button
                      onClick={() => setActiveTab('scouts')}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      Vedi tutti i {scouts.length} scout →
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">Statistiche</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Scout Registrati</span>
                    <span className="font-bold text-blue-600">{scouts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Spese Totali</span>
                    <span className="font-bold text-red-600">
                      €{expenses.reduce((sum, expense) => sum + expense.amount, 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Scout in Regola</span>
                    <span className="font-bold text-green-600">
                      {scouts.filter(scout => getScoutDues(scout).remaining <= 0).length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Anticipi Attivi</span>
                    <span className="font-bold text-orange-600">
                      {advances.filter(advance => !advance.reimbursed).length}
                    </span>
                  </div>
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
          </div>
        )}

        {/* Altre sezioni */}
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
              {scouts.map(scout => {
                const dues = getScoutDues(scout);
                return (
                  <div key={scout.id} className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{scout.name} {scout.surname}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {scout.section} {scout.has_siblings && '• Ha fratelli nel gruppo'}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Quota mensile:</span>
                            <div className="font-semibold">€{dues.monthlyRate}/mese</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Totale dovuto:</span>
                            <div className="font-semibold">€{dues.totalDue}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Totale pagato:</span>
                            <div className="font-semibold text-green-600">€{dues.totalPaid}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Rimanente:</span>
                            <div className={`font-semibold ${dues.remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              €{Math.abs(dues.remaining).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        {dues.missingMonths.length > 0 && (
                          <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              <strong>Mesi mancanti:</strong> {dues.missingMonths.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        {dues.remaining <= 0 ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <Check size={20} />
                            <span className="font-semibold">In regola</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-600">
                            <X size={20} />
                            <span className="font-semibold">Da pagare</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
                      <div className="flex gap-2 mt-2">
                        {!advance.reimbursed && (
                          <button
                            onClick={() => markAdvanceAsReimbursed(advance.id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Rimborsa
                          </button>
                        )}
                        <button
                          onClick={() => deleteAdvance(advance.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                        >
                          Elimina
                        </button>
                      </div>
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
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded">
                  Aggiungi
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddScout(false)}
                  className="flex-1 bg-gray-300 py-2 rounded"
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
                <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded">
                  Aggiungi
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddIncome(false)}
                  className="flex-1 bg-gray-300 py-2 rounded"
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
                <button type="submit" className="flex-1 bg-red-600 text-white py-2 rounded">
                  Aggiungi
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 bg-gray-300 py-2 rounded"
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
                <button type="submit" className="flex-1 bg-orange-600 text-white py-2 rounded">
                  Aggiungi
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddAdvance(false)}
                  className="flex-1 bg-gray-300 py-2 rounded"
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
};

export default ScoutPaymentApp;
