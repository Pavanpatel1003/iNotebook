import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import React, { useContext } from 'react';

import noteContext from '../context/notes/noteContext';





const About = () => {

    const context = useContext(noteContext);


    const {getNotes } = context;
    const navigate = useNavigate();


    useEffect(() => {
        if (localStorage.getItem('token')) {
            getNotes();
        }
        else {
            console.log("sucess")
            navigate('/login');
        }
        // eslint-disable-next-line
    }, [])

}

export default About
