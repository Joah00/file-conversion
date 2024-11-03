import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';
import { TextField, Button, CssBaseline, ThemeProvider, createTheme } from '@mui/material';

function LoginPage({ setUserRole }) { 
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const theme = createTheme({
    palette: {
      primary: {
        main: '#1ab394',  
      },
      background: {
        default: '#2f4050',  
      },
    },
    components: {
      MuiTextField: {
        styleOverrides: {
          root: {
            marginBottom: '20px',  
            '& .MuiInputBase-input': {
              color: 'white',  
            },
            '& .MuiInputLabel-root': {
              color: '#b5b5b5',  
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'white', 
              },
              '&:hover fieldset': {
                borderColor: 'white',  
              },
              '&.Mui-focused fieldset': {
                borderColor: '#1ab394',  
              },
            }
          },
        },
      },
    },
  });


  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:5000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username: email, password: password }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.msg || 'Login failed');
        return;
      }
  
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      setUserRole(data.role);
      navigate('/homePage');
    } catch (error) {
      console.error('Login error:', error); 
      alert('Network error. Check the server or CORS settings.');
    }
  };
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="login-container">
        <div className="Logo">
          <h2>NeuroFormatter</h2>
        </div>
        <div className="login-box">
          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <TextField
              fullWidth
              required
              id="email"
              label="Email"
              variant="filled"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <TextField
              fullWidth
              required
              id="password"
              label="Password"
              type="password"
              variant="filled"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              style={{ marginTop: '30px' }}
            >
              Login
            </Button>
          </form>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default LoginPage;
