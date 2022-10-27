import React from 'react'
import { useNavigate } from "react-router-dom";
import { useState } from 'react';


const Singup = () => {

    const [email, setEmail] = useState();
    const [password, setPassword] = useState();
    const [name, setName] = useState();
    const [cpassword, setCPassword] = useState();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        const response = await fetch("http://localhost:5000/api/auth/createuser", {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: name, email: email, password: password, cpassword: cpassword }),

        });
        const json = await response.json();

        if (json.sucess) {
            // Save the uth token aand rediect
            // localStorage.setItem('token', json.authtoken)
            navigate('/');

        } else {
            alert("invalid credentials ")
        }
    }
    const onChangeName = (e) => {
        setName(e.target.value)
    }

    const onChangeEmail = (e) => {
        setEmail(e.target.value)
    }

    const onChangePassword = (e) => {
        setPassword(e.target.value)
    }

    const onChangeCPassword = (e) => {
        setCPassword(e.target.value)
    }

    return (
        <div className='container mx-2 mt-5'>
            <h2>Create an Account to use iNotebook</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group my-3">
                    <label htmlFor="name">Name</label>
                    <input type="text" className="form-control" id="name" name='name' onChange={onChangeName} aria-describedby="emailHelp" placeholder="Enter Name" />
                </div>

                <div className="form-group my-3">
                    <label htmlFor="email">Email address</label>
                    <input type="email" className="form-control" id="email" name='email' onChange={onChangeEmail} aria-describedby="emailHelp" placeholder="Enter email" />
                    <small id="emailHelp" className="form-text text-muted">We'll never share your email with anyone else.</small>
                </div>

                <div className="form-group my-3">
                    <label htmlFor="password">Password</label>
                    <input type="password" className="form-control" id="password" name='password' onChange={onChangePassword} placeholder="Password" minLength={5} required />
                </div>

                <div className="form-group my-3">
                    <label htmlFor="cpassword">Conform Password</label>
                    <input type="password" className="form-control" id="cpassword" name='cpassword' onChange={onChangeCPassword} placeholder=" Conform Password" minLength={5} required />
                </div>

                <button type="submit" className="btn btn-primary">Signup</button>
            </form>
        </div>
    )
}

export default Singup ;
