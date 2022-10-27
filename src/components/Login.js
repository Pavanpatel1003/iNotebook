import React from 'react'
import { useState } from 'react';
import { useNavigate } from "react-router-dom";

const Login = () => {

  const [email, setEmail] = useState()
  const [password, setPassword] = useState()

  let navigate = useNavigate();
  //let history = useHistory();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: 'POST', // *GET, POST, PUT, DELETE, etc.
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email, password: password }),

    });

    const json = await response.json();
    console.log(json);

    if (json.sucess) {
      // Save the auth token and rediect
      console.log("welcome to home page")
      localStorage.setItem('token', json.authtoken)
      navigate("/")
    } else {
      alert("invalid credentials")
    }
  }

  const onChangeEmail = (e) => {
    setEmail(e.target.value)
  }

  const onChangePassword = (e) => {
    setPassword(e.target.value)
  }

  return (
    <div className='mt-5'>
      <h2> Login to Continue to iNotebook</h2>

      <form onSubmit={handleSubmit}>

        <div className="form-group my-2 mt-4">
          <label htmlFor="email ">Email address</label>
          <input type="email" className="form-control" id="email" name='email ' value={email} aria-describedby="emailHelp" placeholder="Enter email" onChange={onChangeEmail} />
          <small id="emailHelp" className="form-text text-muted">We'll never share your email with anyone else.</small>
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input type="password" className="form-control" id="password" name='password ' value={password} aria-describedby="emailHelp" placeholder="Enter password" onChange={onChangePassword} />
        </div>

        <button type="submit" className="btn btn-primary my-2" >Submit</button>
      </form>
    </div>
  )
}

export default Login;