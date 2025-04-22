// src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import GroupHomePage from './pages/GroupsHome.jsx';
import AddExpensePage from './pages/AddExpensePage.jsx';
import SettleDebtPage from './pages/SettleDebtPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <header style={{ padding: '1rem', background: '#f5f5f5' }}>
        <nav style={{ display: 'flex', gap: '1rem' }}>
          <NavLink 
            to="/groups"
            style={({ isActive }) => ({
              textDecoration: isActive ? 'underline' : 'none'
            })}
          >
            Groups
          </NavLink>
          <NavLink 
            to="/expenses"
            style={({ isActive }) => ({
              textDecoration: isActive ? 'underline' : 'none'
            })}
          >
            Add Expense
          </NavLink>
          <NavLink
            to="/settle-debt"
            style={({ isActive }) => ({
              textDecoration: isActive ? 'underline' : 'none'
            })}
          >
            Settle Debt
          </NavLink>
        </nav>
      </header>

      <main style={{ padding: '1rem' }}>
        <Routes>
          <Route path="/" element={<Navigate replace to="/groups" />} />
          <Route path="/groups" element={<GroupHomePage />} />
          <Route path="/expenses" element={<AddExpensePage />} />
          <Route path="/settle-debt" element={<SettleDebtPage />} />
          <Route path="*" element={<div>404 - Page not found</div>} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
