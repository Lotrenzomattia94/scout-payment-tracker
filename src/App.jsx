import React, { useState, useEffect } from 'react';
import { Plus, Users, DollarSign, CreditCard, Banknote, AlertCircle, Check, X, Home, Settings, Wifi, WifiOff } from 'lucide-react';

// Configurazione Supabase
const SUPABASE_URL = 'https://tmmdcrjyjqnkeevcspwm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtbWRjcmp5anFua2VldmNzcHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NDA4OTgsImV4cCI6MjA2NjUxNjg5OH0.WjQbevq8xnrJjk4wFM1F7uU0OLUaiyxErkaFw8SvaVw';

// Client che usa localStorage come fallback
class LocalStorageClient {
  async query(table, options = {}) {
    const data = JSON.parse(localStorage.getItem(table) || '[]');
    let result = [...data];
    
    if (options.eq) {
      Object.entries(options.eq).forEach(([key, value]) => {
        result = result.filter(item => item[key] == value);
      });
    }
    
    return result;
  }

  async insert(table, data) {
    const existing = JSON.parse(localStorage.getItem(table) || '[]');
    const newData = Array.isArray(data) ? data : [data];
    const withIds = newData.map(item => ({
      ...item,
      id: item.id || Date.now() + Math.random()
    }));
    
    const updated = [...existing, ...withIds];
    localStorage.setItem(table, JSON.stringify(updated));
    return withIds;
  }

  async update(table, data, conditions) {
    const existing = JSON.parse(localStorage.getItem(table) || '[]');
    const updated = existing.map(item => {
      const matches = Object.entries(conditions).every(([key, value]) => item[key] == value);
      return matches ? { ...item, ...data } : item;
    });
    
    localStorage.setItem(table, JSON.stringify(updated));
    return updated;
  }

  async delete(table, conditions) {
    const existing = JSON.parse(localStorage.getItem(table) || '[]');
    const filtered = existing.filter(item => {
      return !Object.entries(conditions).every(([key, value]) => item[key] == value);
    });
    
    localStorage.setItem(table, JSON.stringify(filtered));
    return filtered;
  }
}

class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.headers = {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=representation'  // Importante per v52
    };
  }

  async query(table, options = {}) {
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
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: this.headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Query failed: ${response.status} - ${errorText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Supabase query error:', error);
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
        body: JSON.stringify(Array.isArray(data) ? data : [data])
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Insert failed: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      return Array.isArray(data) ? result : result[0];
    } catch (error) {
      console.error('Supabase insert error:', error);
      throw error;
    }
  }

  async update(table, data, conditions) {
    let url = `${this.url}/rest/v1/${table}`;
    const params = new URLSearchParams();
    
    Object.entries(conditions).forEach(([key, value]) => {
      params.append(key, `eq.${value}`);
    });
    
    url += `?${params.toString()}`;
    
    try {
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
        throw new Error(`Update failed: ${response.status} - ${errorText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
  }

  async delete(table, conditions) {
    let url = `${this.url}/rest/v1/${table}`;
    const params = new URLSearchParams();
    
    Object.entries(conditions).forEach(([key, value]) => {
      params.append(key, `eq.${value}`);
    });
    
    url += `?${params.toString()}`;
    
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.headers
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${response.status} - ${errorText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Supabase delete error:', error);
      throw error;
    }
  }
}

const ScoutPaymentApp = () => {
  const ScoutPaymentApp = () => {
  // TEST CONNESSIONE DATABASE
  const testDatabase = async () => {
    console.log('🧪 Test connessione database...');
    try {
      const testData = {
        name: 'Test Gruppo',
        access_code: 'TEST123',
        created_at: new Date().toISOString()
      };
      
      console.log('📤 Tentativo inserimento:', testData);
      const result = await db.insert('groups', testData);
      console.log('✅ Test riuscito!', result);
      
      // Prova a leggere
      const groups = await db.query('groups');
      console.log('📊 Gruppi nel database:', groups);
      
    } catch (error) {
      console.error('❌ Test fallito:', error);
    }
  };

  // Esegui test all'avvio (solo per debug)
  useEffect(() => {
    if (groupId) {
      console.log('🧪 Eseguo test database...');
      testDatabase();
    }
  }, []);

  // ... resto del codice esistente
  const [activeTab, setActiveTab] = useState('dashboard');
  const [scouts, setScouts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [extraIncomes, setExtraIncomes] = useState([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isLoading, setIsLoading] = useState(false);
  const [groupId, setGroupId] = useState(localStorage.getItem('groupId'));
  const [groupName, setGroupName] = useState(localStorage.getItem('groupName') || '');
  const [showGroupSetup, setShowGroupSetup] = useState(!groupId);
  
  // Modals
  const [showAddScout, setShowAddScout] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddAdvance, setShowAddAdvance] = useState(false);
  const [showAddIncome, setShowAddIncome] = useState(false);

  // Inizializza client database
  const db = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? new LocalStorageClient() 
    : new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const [useLocalStorage, setUseLocalStorage] = useState(
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  );

  // Monitora connessione
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Carica dati dal database
  const loadData = async () => {
    if (!groupId) return;
    
    setIsLoading(true);
    try {
      const [scoutsData, expensesData, advancesData, incomesData] = await Promise.all([
        db.query('scouts', { eq: { group_id: groupId } }),
        db.query('expenses', { eq: { group_id: groupId } }),
        db.query('advances', { eq: { group_id: groupId } }),
        db.query('extra_incomes', { eq: { group_id: groupId } })
      ]);

      setScouts(scoutsData || []);
      setExpenses(expensesData || []);
      setAdvances(advancesData || []);
      setExtraIncomes(incomesData || []);
    } catch (error) {
      console.error('Errore caricamento dati:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (groupId) {
      loadData();
    }
  }, [groupId]);

  // Setup gruppo (versione localStorage)
  const setupGroup = async (name, code = null) => {
  setIsLoading(true);
  
  try {
    if (code) {
      // Unisciti a gruppo esistente
      console.log('🔍 Cerco gruppo con codice:', code);
      const groups = await db.query('groups', { eq: { access_code: code } });
      console.log('📊 Risultato ricerca:', groups);
      
      if (!groups || groups.length === 0) {
        alert('Codice gruppo non valido');
        setIsLoading(false);
        return;
      }
      const group = groups[0];
      setGroupId(group.id);
      setGroupName(group.name);
      localStorage.setItem('groupId', group.id);
      localStorage.setItem('groupName', group.name);
    } else {
      // Crea nuovo gruppo
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log('🆕 Creo nuovo gruppo:', { name, accessCode });
      
      const groupData = {
        name,
        access_code: accessCode,
        created_at: new Date().toISOString()
      };
      
      const newGroup = await db.insert('groups', groupData);
      console.log('✅ Gruppo creato:', newGroup);
      
      if (!newGroup) {
        throw new Error('Errore nella creazione del gruppo');
      }
      
      setGroupId(newGroup.id);
      setGroupName(newGroup.name);
      localStorage.setItem('groupId', newGroup.id);
      localStorage.setItem('groupName', newGroup.name);
      
      alert(`Gruppo creato! Codice di accesso: ${accessCode}\n\nCondividi questo codice con gli altri capi per accedere al gruppo!`);
    }
    setShowGroupSetup(false);
  } catch (error) {
    console.error('❌ Errore setup gruppo:', error);
    alert(`Errore durante la configurazione del gruppo: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

  // Calcola i totali finanziari
  const calculateTotals = () => {
    let bankTotal = 0;
    let cashTotal = 0;
    
    // Somma incassi scout
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
    
    // Somma entrate extra
    extraIncomes.forEach(income => {
      if (income.method === 'bonifico') {
        bankTotal += income.amount;
      } else {
        cashTotal += income.amount;
      }
    });
    
    // Sottrai spese
    expenses.forEach(expense => {
      if (expense.method === 'bonifico') {
        bankTotal -= expense.amount;
      } else {
        cashTotal -= expense.amount;
      }
    });
    
    // Sottrai anticipi non rimborsati
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
    const newScout = {
      ...scoutData,
      group_id: groupId,
      created_at: new Date().toISOString()
    };
    
    try {
      const result = await db.insert('scouts', newScout);
      setScouts([...scouts, { ...result[0], payments: [] }]);
      setShowAddScout(false);
    } catch (error) {
      console.error('Errore aggiunta scout:', error);
    }
  };

  const addExpense = async (expenseData) => {
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
    } catch (error) {
      console.error('Errore aggiunta spesa:', error);
    }
  };

  const addExtraIncome = async (incomeData) => {
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
    } catch (error) {
      console.error('Errore aggiunta entrata:', error);
    }
  };

  const addAdvance = async (advanceData) => {
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
    } catch (error) {
      console.error('Errore aggiunta anticipo:', error);
    }
  };

  const markAdvanceAsReimbursed = async (advanceId) => {
    try {
      await db.update('advances', { reimbursed: true }, { id: advanceId });
      setAdvances(advances.map(advance => 
        advance.id === advanceId ? { ...advance, reimbursed: true } : advance
      ));
    } catch (error) {
      console.error('Errore rimborso anticipo:', error);
    }
  };

  const deleteExpense = async (expenseId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa spesa?')) return;
    
    try {
      await db.delete('expenses', { id: expenseId });
      setExpenses(expenses.filter(expense => expense.id !== expenseId));
    } catch (error) {
      console.error('Errore eliminazione spesa:', error);
    }
  };

  const deleteAdvance = async (advanceId) => {
    if (!window.confirm('Sei sicuro di voler eliminare questo anticipo?')) return;
    
    try {
      await db.delete('advances', { id: advanceId });
      setAdvances(advances.filter(advance => advance.id !== advanceId));
    } catch (error) {
      console.error('Errore eliminazione anticipo:', error);
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

  // Setup iniziale
  if (showGroupSetup) {
    return <GroupSetupModal />;
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
          <div className="bg-white p-8 rounded-lg shadow-sm border text-center">
            <h2 className="text-xl font-semibold mb-4">Gestione Scout</h2>
            <p className="text-gray-600 mb-4">Sezione completa in fase di sviluppo</p>
            <button
              onClick={() => setShowAddScout(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Aggiungi Scout
            </button>
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
