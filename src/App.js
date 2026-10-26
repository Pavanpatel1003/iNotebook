import './App.css';
import React, { useEffect, useState } from "react";
import Navbar from './components/Navbar';
import Home from './components/Home';
import About from './components/About'

import {
  BrowserRouter as Router,
  Routes, //  switch
  Route
} from "react-router-dom";

import NoteState from './context/notes/NoteState';
import Singup from './components/Singup';
import Login from './components/Login';


function App() {
  const [theme, setTheme] = useState(() => (
    localStorage.getItem('inotebook-theme') === 'dark' ? 'dark' : 'light'
  ));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('inotebook-theme', theme);
  }, [theme]);

  return (
    <NoteState>
      <Router>
        <div className="app">
          <Navbar theme={theme} onToggleTheme={() => setTheme((currentTheme) => (
            currentTheme === 'dark' ? 'light' : 'dark'
          ))}></Navbar>
          <main className="page-content">
            <Routes>
              <Route path='/' element={<Home />}></Route>
              <Route path='/about' element={<About />}></Route>
              <Route path='/signup' element={<Singup />}></Route>
              <Route path='/login' element={<Login />}></Route>
              <Route path='*' element={<div className="empty-state">This page could not be found.</div>}></Route>
            </Routes>
          </main>
        </div>
      </Router>
    </NoteState>
  );
}

export default App;
