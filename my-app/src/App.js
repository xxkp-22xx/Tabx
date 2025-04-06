import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import GroupPage from './pages/group';
import AddExpense from './pages/addExpense';
import GroupDebts from './pages/groupDebts';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/groups" element={<GroupPage />} />
        
        <Route path="/groups/:groupId/add-expense" element={<AddExpense />} />
        
        <Route path="/" element={<Navigate to="/groups" replace />} />

        <Route path="*" element={<Navigate to="/groups" replace />} />

        <Route path="/group-debts" element={<GroupDebts />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;