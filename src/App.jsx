import React, { useState, useReducer, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronsRight, LogOut, Briefcase, Users, DollarSign, CheckSquare, XSquare, PlusCircle, Settings, Upload, Monitor } from 'lucide-react';

// --- Global Constants and Initial State ---

const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  PUBLIC: 'Public',
};

const PAGES = {
  LOGIN: 'login',
  DASHBOARD: 'dashboard',
  SUBMIT_EXPENSE: 'submit_expense',
  APPROVAL_INBOX: 'approval_inbox',
  ADMIN_USERS: 'admin_users',
  ADMIN_RULES: 'admin_rules',
};

const mockUsers = {
  'admin@company.com': { id: 1, role: ROLES.ADMIN, name: 'Ava Admin', managerId: null },
  'manager@company.com': { id: 2, role: ROLES.MANAGER, name: 'Mike Manager', managerId: 1 },
  'employee@company.com': { id: 3, role: ROLES.EMPLOYEE, name: 'Emily Employee', managerId: 2 },
};

const initialExpenses = [
  { id: 101, userId: 3, employeeName: 'Emily Employee', category: 'Travel', originalAmount: 450, originalCurrency: 'EUR', companyAmount: 495, status: 'Pending', currentStep: 'Manager', date: '2025-10-01' },
  { id: 102, userId: 3, employeeName: 'Emily Employee', category: 'Software', originalAmount: 50, originalCurrency: 'USD', companyAmount: 50, status: 'Approved', currentStep: 'Completed', date: '2025-09-28' },
  { id: 103, userId: 4, employeeName: 'John Doe', category: 'Meals', originalAmount: 3500, originalCurrency: 'INR', companyAmount: 42, status: 'Rejected', currentStep: 'Rejected by Finance', date: '2025-09-29' },
];

const mockApprovalRules = {
  rule1: {
    name: 'Standard Travel Flow',
    steps: [
      { id: 1, role: ROLES.MANAGER },
      { id: 2, role: 'Finance' },
      { id: 3, role: 'Director' }
    ],
    conditional: { type: 'None' },
  }
};

const initialState = {
  isAuthenticated: false,
  user: null,
  currentPage: PAGES.LOGIN,
  expenses: initialExpenses,
  rules: mockApprovalRules,
  baseCurrency: 'USD',
  // Used for notification/mocking
  message: null,
};

// --- Reducer for State Management ---

function appReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        currentPage: PAGES.DASHBOARD,
        message: null
      };
    case 'LOGOUT':
      return { ...initialState, currentPage: PAGES.LOGIN };
    case 'NAVIGATE':
      return { ...state, currentPage: action.payload.page, message: null };
    case 'SUBMIT_EXPENSE':
      return {
        ...state,
        expenses: [{ ...action.payload, id: Date.now(), status: 'Pending', currentStep: 'Manager' }, ...state.expenses],
        message: { type: 'success', text: 'Expense submitted successfully!' }
      };
    case 'PROCESS_APPROVAL':
      return {
        ...state,
        expenses: state.expenses.map(exp =>
          exp.id === action.payload.id
            ? {
                ...exp,
                status: action.payload.status,
                currentStep: action.payload.status === 'Approved' ? 'Completed' : `Rejected by ${state.user.name}`,
                approvalComment: action.payload.comment
              }
            : exp
        ),
        message: { type: 'success', text: `Expense ${action.payload.status}!` }
      };
    default:
      return state;
  }
}

// --- Utility Components ---

const Button = ({ children, onClick, variant = 'primary', icon: Icon, disabled = false, className = '' }) => {
  let style = 'text-white font-medium py-2 px-4 rounded-lg transition duration-200 shadow-md flex items-center justify-center space-x-2';
  
  if (variant === 'primary') style += ' bg-indigo-600 hover:bg-indigo-700';
  if (variant === 'secondary') style += ' bg-gray-500 hover:bg-gray-600';
  if (variant === 'success') style += ' bg-green-500 hover:bg-green-600';
  if (variant === 'danger') style += ' bg-red-500 hover:bg-red-600';
  if (variant === 'outline') style = 'bg-white text-indigo-600 border border-indigo-600 hover:bg-indigo-50 py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center space-x-2';

  if (disabled) style += ' opacity-50 cursor-not-allowed';

  return (
    <button className={`${style} ${className}`} onClick={onClick} disabled={disabled}>
      {Icon && <Icon size={18} />}
      <span>{children}</span>
    </button>
  );
};

const Card = ({ title, children, className = '' }) => (
  <div className={`bg-white p-6 rounded-xl shadow-lg border border-gray-200 ${className}`}>
    {title && <h2 className="text-2xl font-semibold text-gray-800 mb-4 border-b pb-2">{title}</h2>}
    {children}
  </div>
);

const Notification = ({ message, type }) => {
  if (!message) return null;
  const colors = type === 'success' ? 'bg-green-100 text-green-700 border-green-400' : 'bg-red-100 text-red-700 border-red-400';
  
  return (
    <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-xl border ${colors} z-50 transition-opacity duration-300`}>
      {message}
    </div>
  );
};

// --- Core Layout and Navigation ---

const Sidebar = ({ user, currentPage, dispatch }) => {
  const getNavItems = (role) => {
    const baseItems = [{ name: 'Dashboard', page: PAGES.DASHBOARD, icon: Monitor }];
    
    if (role === ROLES.EMPLOYEE) {
      return [...baseItems, { name: 'Submit Expense', page: PAGES.SUBMIT_EXPENSE, icon: PlusCircle }];
    }
    if (role === ROLES.MANAGER) {
      return [...baseItems, { name: 'Approval Inbox', page: PAGES.APPROVAL_INBOX, icon: CheckSquare }];
    }
    if (role === ROLES.ADMIN) {
      return [
        ...baseItems,
        { name: 'User Management', page: PAGES.ADMIN_USERS, icon: Users },
        { name: 'Approval Rules', page: PAGES.ADMIN_RULES, icon: Settings },
        { name: 'Override Approvals', page: PAGES.APPROVAL_INBOX, icon: Monitor }, // Admin can also use the inbox
      ];
    }
    return baseItems;
  };

  const navItems = getNavItems(user.role);

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col h-full">
      <div className="p-6 text-2xl font-bold border-b border-gray-700">Odoo Expense</div>
      <div className="flex flex-col flex-grow p-4 space-y-2">
        {navItems.map(item => (
          <div
            key={item.page}
            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition duration-150 ${
              currentPage === item.page ? 'bg-indigo-600 shadow-lg font-semibold' : 'hover:bg-gray-700'
            }`}
            onClick={() => dispatch({ type: 'NAVIGATE', payload: { page: item.page } })}
          >
            <item.icon size={20} />
            <span>{item.name}</span>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-gray-700">
        <div className="text-sm text-gray-300">Logged in as:</div>
        <div className="font-semibold">{user.name} ({user.role})</div>
        <Button onClick={() => dispatch({ type: 'LOGOUT' })} variant="danger" className="mt-3 w-full" icon={LogOut}>
          Logout
        </Button>
      </div>
    </div>
  );
};

// --- Role-Specific Pages ---

// 1. Employee Pages

const SubmitExpensePage = ({ user, dispatch, baseCurrency }) => {
  const [formData, setFormData] = useState({
    category: '',
    originalAmount: '',
    originalCurrency: 'EUR',
    description: '',
    date: new Date().toISOString().substring(0, 10),
    receiptImage: null,
  });
  const [loadingOCR, setLoadingOCR] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleOcrUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData({ ...formData, receiptImage: file.name });
    setLoadingOCR(true);
    
    // Mock OCR process
    setTimeout(() => {
      setLoadingOCR(false);
      // Mock data returned from OCR
      setFormData({
        ...formData,
        category: 'Meals',
        originalAmount: '89.50',
        originalCurrency: 'EUR',
        description: 'Dinner at The Bistro',
      });
      dispatch({ type: 'SET_MESSAGE', payload: { type: 'success', text: 'Receipt scanned successfully! Fields auto-filled.' } });
    }, 1500);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.originalAmount || !formData.category) {
      alert("Please fill in required fields.");
      return;
    }
    // Mock currency conversion: EUR to USD 1.10
    const convertedAmount = parseFloat(formData.originalAmount) * (formData.originalCurrency === 'EUR' ? 1.10 : 1);

    dispatch({
      type: 'SUBMIT_EXPENSE',
      payload: {
        userId: user.id,
        employeeName: user.name,
        category: formData.category,
        originalAmount: parseFloat(formData.originalAmount),
        originalCurrency: formData.originalCurrency,
        companyAmount: convertedAmount.toFixed(2),
        date: formData.date,
      }
    });

    // Reset form after submission
    setFormData({ category: '', originalAmount: '', originalCurrency: 'EUR', description: '', date: new Date().toISOString().substring(0, 10), receiptImage: null });
    dispatch({ type: 'NAVIGATE', payload: { page: PAGES.DASHBOARD } });
  };

  const categories = ['Travel', 'Meals', 'Software', 'Accommodation', 'Office Supplies'];
  const currencies = ['USD', 'EUR', 'GBP', 'INR'];

  return (
    <Card title="Submit New Expense Claim" className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* OCR Upload Area */}
          <div className="col-span-1 md:col-span-2 border-2 border-dashed border-indigo-300 rounded-lg p-6 text-center hover:border-indigo-500 transition duration-150">
            <input
              type="file"
              id="ocr-upload"
              className="hidden"
              accept="image/*"
              onChange={handleOcrUpload}
              disabled={loadingOCR}
            />
            <label htmlFor="ocr-upload" className="cursor-pointer">
              {loadingOCR ? (
                <div className="text-indigo-600 flex items-center justify-center space-x-2">
                  <Monitor className="animate-pulse" size={24} />
                  <span>Scanning Receipt (OCR in Progress)...</span>
                </div>
              ) : (
                <div className="text-indigo-600 flex flex-col items-center">
                  <Upload size={32} />
                  <p className="mt-2 font-medium">Click or Drag Image to Scan Receipt</p>
                  <p className="text-sm text-gray-500">Auto-fill Amount, Date, and Category using OCR.</p>
                  {formData.receiptImage && <p className="text-sm text-green-600 mt-1">File attached: {formData.receiptImage}</p>}
                </div>
              )}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="">Select Category</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div className="flex space-x-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                name="originalAmount"
                value={formData.originalAmount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div className="w-1/4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                name="originalCurrency"
                value={formData.originalCurrency}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              >
                {currencies.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows="3"
              value={formData.description}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Brief purpose of the expense..."
            ></textarea>
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="primary" className="md:w-auto w-full">Submit Claim</Button>
        </div>
      </form>
    </Card>
  );
};

const DashboardPage = ({ user, expenses, baseCurrency }) => {
  const userExpenses = user.role === ROLES.EMPLOYEE
    ? expenses.filter(exp => exp.userId === user.id)
    : expenses; // Admins and Managers see all/team expenses

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700 border-green-400';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-400';
      case 'Pending':
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-400';
    }
  };

  return (
    <Card title={user.role === ROLES.EMPLOYEE ? "My Expense History" : "Team / All Expenses Overview"}>
      <p className="text-gray-500 mb-4">Displaying all expenses with their current status in **{baseCurrency}**.</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-3">ID</th>
              {user.role !== ROLES.EMPLOYEE && <th className="px-6 py-3">Employee</th>}
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Original Amount</th>
              <th className="px-6 py-3">Company Amount ({baseCurrency})</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Current Step</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {userExpenses.length > 0 ? (
              userExpenses.sort((a, b) => b.id - a.id).map(exp => (
                <tr key={exp.id} className="hover:bg-gray-50 transition duration-100">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exp.id}</td>
                  {user.role !== ROLES.EMPLOYEE && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.employeeName}</td>}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.originalAmount} {exp.originalCurrency}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">{exp.companyAmount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusStyle(exp.status)}`}>
                      {exp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {exp.status === 'Approved' ? 'Completed' : exp.currentStep}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={8} className="text-center py-10 text-gray-500">No expenses found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

// 2. Manager/Admin Pages

const ApprovalInboxPage = ({ user, expenses, dispatch, baseCurrency }) => {
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [comment, setComment] = useState('');

  // Manager sees expenses pending for them. Admin sees all pending for oversight.
  const pendingExpenses = expenses.filter(exp => exp.status === 'Pending' && (
    user.role === ROLES.ADMIN || (user.role === ROLES.MANAGER && exp.currentStep === 'Manager')
  ));

  const handleAction = (status) => {
    if (!selectedExpense) return;
    if (status === 'Rejected' && !comment.trim()) {
        alert("A comment is required for rejection.");
        return;
    }
    dispatch({
      type: 'PROCESS_APPROVAL',
      payload: { id: selectedExpense.id, status, comment }
    });
    setSelectedExpense(null);
    setComment('');
  };

  const StatusPill = ({ status }) => (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
      {status}
    </span>
  );

  const ApprovalModal = () => (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
        <h3 className="text-xl font-bold border-b pb-2">Review Expense #{selectedExpense.id}</h3>
        <div className="text-sm space-y-2">
          <p><strong>Employee:</strong> {selectedExpense.employeeName}</p>
          <p><strong>Category:</strong> {selectedExpense.category}</p>
          <p><strong>Amount:</strong> {selectedExpense.originalAmount} {selectedExpense.originalCurrency} ({selectedExpense.companyAmount} {baseCurrency})</p>
          <p><strong>Current Step:</strong> <StatusPill status={selectedExpense.currentStep} /></p>
        </div>
        <textarea
          rows="3"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Enter approval or rejection comments (required for rejection)..."
          className="w-full p-3 border border-gray-300 rounded-lg"
        ></textarea>
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={() => setSelectedExpense(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => handleAction('Rejected')} icon={XSquare}>Reject</Button>
          <Button variant="success" onClick={() => handleAction('Approved')} icon={CheckSquare}>Approve</Button>
        </div>
      </div>
    </div>
  );

  return (
    <Card title="Expense Approval Inbox">
      <p className="text-gray-500 mb-4">Expenses awaiting your review. Amounts are shown in **{baseCurrency}**.</p>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-6 py-3">ID</th>
              <th className="px-6 py-3">Employee</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Amount ({baseCurrency})</th>
              <th className="px-6 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pendingExpenses.length > 0 ? (
              pendingExpenses.map(exp => (
                <tr key={exp.id} className="hover:bg-gray-50 transition duration-100">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exp.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.employeeName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-gray-700">{exp.companyAmount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="outline" onClick={() => setSelectedExpense(exp)}>Review</Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="text-center py-10 text-gray-500">No expenses require your approval. Great job!</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {selectedExpense && <ApprovalModal />}
    </Card>
  );
};


// 3. Admin Pages

const AdminUsersPage = () => {
  const [newUserData, setNewUserData] = useState({ name: '', email: '', role: ROLES.EMPLOYEE, manager: '' });
  const [users, setUsers] = useState(Object.values(mockUsers).filter(u => u.role !== ROLES.ADMIN));

  const managers = Object.values(mockUsers).filter(u => u.role === ROLES.MANAGER || u.role === ROLES.ADMIN);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newUser = {
        ...newUserData,
        id: Date.now(),
        managerId: newUserData.manager,
        manager: managers.find(m => m.id === newUserData.manager)?.name || 'N/A'
    };
    setUsers([...users, newUser]);
    setNewUserData({ name: '', email: '', role: ROLES.EMPLOYEE, manager: '' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card title="Create New User" className="lg:col-span-1">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" className="w-full p-2 border rounded-lg" value={newUserData.name} onChange={(e) => setNewUserData({...newUserData, name: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" className="w-full p-2 border rounded-lg" value={newUserData.email} onChange={(e) => setNewUserData({...newUserData, email: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select className="w-full p-2 border rounded-lg" value={newUserData.role} onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}>
              <option value={ROLES.EMPLOYEE}>Employee</option>
              <option value={ROLES.MANAGER}>Manager</option>
            </select>
          </div>
          {newUserData.role === ROLES.EMPLOYEE && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Reports To (Manager)</label>
              <select className="w-full p-2 border rounded-lg" value={newUserData.manager} onChange={(e) => setNewUserData({...newUserData, manager: parseInt(e.target.value)})}>
                <option value="">Select Manager</option>
                {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <Button type="submit" variant="primary" className="w-full">Create User</Button>
        </form>
      </Card>

      <Card title="User List" className="lg:col-span-2">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Manager</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{user.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">{user.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.manager || mockUsers[Object.keys(mockUsers).find(k => mockUsers[k].id === user.managerId)]?.name || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const AdminRulesPage = ({ rules, dispatch }) => {
  const [currentRule, setCurrentRule] = useState(rules['rule1']);

  // Mock function for adding/removing steps in the multi-level flow
  const handleStepChange = (action, stepId) => {
    let newSteps = [...currentRule.steps];
    if (action === 'add') {
      newSteps.push({ id: Date.now(), role: 'New Role' });
    } else if (action === 'remove') {
      newSteps = newSteps.filter(step => step.id !== stepId);
    }
    setCurrentRule({ ...currentRule, steps: newSteps });
  };

  const handleConditionalChange = (key, value) => {
    setCurrentRule({
      ...currentRule,
      conditional: {
        ...currentRule.conditional,
        [key]: value
      }
    });
  };

  const rolesForSteps = ['Finance', 'Director', 'HR', 'President'];

  return (
    <Card title="Configure Approval Rules">
      <h3 className="text-xl font-medium mb-4">Rule Name: {currentRule.name}</h3>

      {/* Multi-Level Approval Flow */}
      <div className="mb-8 p-4 border rounded-lg bg-indigo-50">
        <h4 className="font-semibold text-lg text-indigo-800 mb-3 flex items-center"><ChevronsRight size={20} className="mr-2" /> Multi-Level Approval Sequence</h4>
        <div className="space-y-3">
          {currentRule.steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm border">
              <span className="font-bold text-gray-700 w-12">Step {index + 1}:</span>
              <select
                className="flex-grow p-2 border rounded-lg"
                value={step.role}
                onChange={(e) => {
                  const newSteps = currentRule.steps.map(s => s.id === step.id ? { ...s, role: e.target.value } : s);
                  setCurrentRule({...currentRule, steps: newSteps});
                }}
              >
                <option value={ROLES.MANAGER}>Employee's Manager</option>
                {rolesForSteps.map(role => <option key={role} value={role}>{role}</option>)}
              </select>
              <Button variant="danger" className="w-10 h-10 p-0" onClick={() => handleStepChange('remove', step.id)} disabled={currentRule.steps.length === 1}>
                -
              </Button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => handleStepChange('add')} icon={PlusCircle}>Add Approval Step</Button>
        </div>
      </div>

      {/* Conditional Approval Flow */}
      <div className="p-4 border rounded-lg bg-green-50">
        <h4 className="font-semibold text-lg text-green-800 mb-3 flex items-center"><Settings size={20} className="mr-2" /> Conditional Approval Rules</h4>
        
        <div className="space-y-4">
            <h5 className='font-medium'>Percentage Rule:</h5>
            <div className="flex items-center space-x-3">
                <input
                    type="number"
                    value={currentRule.conditional.percentage || 60}
                    onChange={(e) => handleConditionalChange('percentage', parseInt(e.target.value))}
                    min="1" max="100"
                    className="w-20 p-2 border rounded-lg text-center"
                />
                <span className='text-gray-700'>% of approvers must approve $\implies$ Expense Auto-Approved.</span>
            </div>

            <h5 className='font-medium pt-3 border-t'>Specific Approver Rule:</h5>
            <div className="flex items-center space-x-3">
                <select
                    value={currentRule.conditional.specificApprover || 'Director'}
                    onChange={(e) => handleConditionalChange('specificApprover', e.target.value)}
                    className="w-48 p-2 border rounded-lg"
                >
                    <option value="CFO">CFO</option>
                    <option value="Director">Director</option>
                    <option value="CEO">CEO</option>
                </select>
                <span className='text-gray-700'>approves $\implies$ Expense Auto-Approved (overrides sequence).</span>
            </div>

            <h5 className='font-medium pt-3 border-t'>Hybrid Rule (Combination Logic):</h5>
            <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 text-gray-700">
                    <input type="radio" name="hybridLogic" checked={currentRule.conditional.logic === 'OR'} onChange={() => handleConditionalChange('logic', 'OR')} className="form-radio text-indigo-600" />
                    <span>Percentage OR Specific Approver</span>
                </label>
                <label className="flex items-center space-x-2 text-gray-700">
                    <input type="radio" name="hybridLogic" checked={currentRule.conditional.logic === 'AND'} onChange={() => handleConditionalChange('logic', 'AND')} className="form-radio text-indigo-600" />
                    <span>Percentage AND Specific Approver</span>
                </label>
            </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button variant="primary" onClick={() => {
            dispatch({ type: 'SET_RULES', payload: { rules: { ...rules, rule1: currentRule } } });
            alert("Approval Rules Updated (Mock Success)");
        }}>
            Save Rule Configuration
        </Button>
      </div>
    </Card>
  );
};

// --- Authentication Page ---

const LoginPage = ({ dispatch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const user = mockUsers[email];

    if (user && password === 'password') { // Mock password check
      dispatch({ type: 'LOGIN', payload: { user } });
    } else {
      alert('Invalid credentials. Try: admin@company.com / manager@company.com / employee@company.com (Password: password)');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card title="Expense Manager Login" className="w-full max-w-md">
        <p className="text-gray-500 mb-4 text-center">Enter your credentials to continue.</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., employee@company.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <Button type="submit" variant="primary" className="w-full">Sign In</Button>
          <p className="text-center text-xs text-gray-400 mt-4">For demo: Password is always 'password'.</p>
        </form>
      </Card>
    </div>
  );
};


// --- Main App Component ---

const AppContent = React.memo(({ state, dispatch }) => {
  if (!state.isAuthenticated) {
    return <LoginPage dispatch={dispatch} />;
  }

  const renderPage = () => {
    switch (state.currentPage) {
      case PAGES.DASHBOARD:
        return <DashboardPage user={state.user} expenses={state.expenses} baseCurrency={state.baseCurrency} />;
      case PAGES.SUBMIT_EXPENSE:
        return <SubmitExpensePage user={state.user} dispatch={dispatch} baseCurrency={state.baseCurrency} />;
      case PAGES.APPROVAL_INBOX:
        return <ApprovalInboxPage user={state.user} expenses={state.expenses} dispatch={dispatch} baseCurrency={state.baseCurrency} />;
      case PAGES.ADMIN_USERS:
        return <AdminUsersPage />;
      case PAGES.ADMIN_RULES:
        return <AdminRulesPage rules={state.rules} dispatch={dispatch} />;
      default:
        return <DashboardPage user={state.user} expenses={state.expenses} baseCurrency={state.baseCurrency} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-inter">
      <Sidebar user={state.user} currentPage={state.currentPage} dispatch={dispatch} />
      <main className="flex-1 overflow-y-auto p-8">
        {renderPage()}
      </main>
      {state.message && (
        <Notification message={state.message.text} type={state.message.type} />
      )}
    </div>
  );
});

// Wrapper to intercept and handle temporary message display
const useNotificationInterceptor = (dispatch) => {
    return useCallback((action) => {
        dispatch(action);
        if (action.type === 'SET_MESSAGE') {
            const { payload } = action;
            setTimeout(() => {
                dispatch({ type: 'SET_MESSAGE', payload: null });
            }, 3000);
        }
    }, [dispatch]);
};

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Custom dispatch function to handle notification clearing
  const customDispatch = useCallback((action) => {
      dispatch(action);
      // Automatically clear messages after a delay if a message action was dispatched
      if (action.type === 'SUBMIT_EXPENSE' || action.type === 'PROCESS_APPROVAL') {
          setTimeout(() => {
              dispatch({ type: 'SET_MESSAGE', payload: null });
          }, 3000);
      }
  }, [dispatch]);

  // Add SET_MESSAGE handler to the reducer manually for temporary alerts
  const dispatchWithSetMessage = useCallback((action) => {
      if (action.type === 'SET_MESSAGE') {
          dispatch(action);
      } else {
          customDispatch(action);
      }
  }, [customDispatch]);


  return <AppContent state={state} dispatch={dispatchWithSetMessage} />;
}
