import './App.css';
import React from "react";
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
  return (
    <>
      <NoteState>

        <Router>

          <Navbar></Navbar>
          <div className="container">
            <Routes>

              <Route exact path='/' element={<Home />}></Route>
              <Route exact path='/about' element={<About />}></Route>
              <Route exact path='/signup' element={<Singup />}></Route>
              <Route exact path='/login' element={< Login />}></Route>

            </Routes>
          </div>
        </Router>

      </NoteState>
    </>
  );
}

export default App;
