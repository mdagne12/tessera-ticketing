import React from 'react';
import {
    Flex,
    Heading,
    Input,
    Button,
    InputLeftElement,
    InputGroup,
    useColorModeValue,
} from '@chakra-ui/react';
import { LuUser } from "react-icons/lu"
import { RiLockPasswordLine } from "react-icons/ri";
import { MdOutlineMail } from "react-icons/md";
import { useNavigate } from 'react-router-dom';
import { Text } from '@chakra-ui/react';
import { useState } from 'react';

const Login = () => {
    const formBackground = useColorModeValue('gray.100', 'gray.700');
    const [isLogin, setIsLogin] = React.useState(true);
    const [email, setEmail] = React.useState('');
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState('');


    const handleSubmit = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
        const endpoint = isLogin ? '/login' : '/user';

        const payload = isLogin
            ? { "username": username, "password":password }
            : { "email": email, "username": username, "password":password, "first_name": firstName, "last_name": lastName };

        const response = await fetch("http://localhost:5000"+ endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        if (isLogin) {
            console.log('Login successful:', data);

            // Example: save JWT
            localStorage.setItem('access_token', data.access_token);

            // Example redirect
            // navigate('/dashboard');
            navigate('/events');
        } else {
            console.log('Account created:', data);
            setIsLogin(true);
        }

    } catch (error) {
        setErrorMessage(error.message);
        console.error('Error:', error.message);
    } finally {
        setLoading(false);
    }
};


    return (
        <Flex h="90vh" alignItems="center" justifyContent="center">
            <Flex flexDirection="row" bg={formBackground} borderRadius={20} boxShadow="lg" w="100%" maxW="900px" h="500px">
                <Flex flex={1.5}>
                    <img src="https://avalonhollywood.com/wp-content/uploads/2024/08/hollywood-nightlife-event-concert-calendar.webp" alt="Login" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px 0 0 20px' }} />
                </Flex>

                <Flex flex={1} flexDirection="column" p={50} justifyContent="center">
                    <Heading align="center" mb={3}>{isLogin ? 'Log In' : 'Create Account'}</Heading>
                    {!isLogin && (
                        <Flex flexDirection="column">
                        <InputGroup>
                            <InputLeftElement pointerEvents='none' color='gray.500'>
                                <MdOutlineMail />
                            </InputLeftElement>
                            <Input placeholder="Email" type="email" variant="filled" mb={3} value={email} onChange={(e) => setEmail(e.target.value)} />
                        </InputGroup>
                    
                        <InputGroup> 
                            <InputLeftElement pointerEvents='none' color='gray.500'>
                                <LuUser />
                            </InputLeftElement>
                            <Input placeholder="First Name" type="text" variant="filled" mb={3} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </InputGroup>

                        <InputGroup> 
                            <InputLeftElement pointerEvents='none' color='gray.500'>
                                <LuUser />
                            </InputLeftElement>
                            <Input placeholder="Last Name" type="text" variant="filled" mb={3} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </InputGroup>

                        </Flex>

                    )}
                    <InputGroup>
                        <InputLeftElement pointerEvents='none' color='gray.500'>
                            <LuUser />
                        </InputLeftElement>
                        <Input placeholder="Username" type="text" variant="filled" mb={3} value={username} onChange={(e) => setUsername(e.target.value)} />
                    </InputGroup>

                    <InputGroup>
                        <InputLeftElement pointerEvents='none' color='gray.500'>
                            <RiLockPasswordLine />
                        </InputLeftElement>
                        <Input placeholder="Password" type="password" variant="filled" mb={3} value={password} onChange={(e) => setPassword(e.target.value)} />
                    </InputGroup>

                    <Button bgGradient="linear(to-r, blue.400, blue.600)" color="white" mb={3} onClick={handleSubmit} isLoading={loading}>
                        {isLogin ? 'Log In' : 'Create Account'}
                    </Button>
                    
                    <Flex justifyContent="center"> 
                        {errorMessage && (<Text textStyle="xs" fontWeight="normal" color="red.500" mb={3}>{errorMessage}</Text>)}
                    </Flex>
                    
                    <Flex justifyContent="center" mb={3}>
                        <Button variant="link" colorScheme="blue" size="sm" onClick={() => setIsLogin(!isLogin)}>
                            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
                        </Button>
                    </Flex>
                    {isLogin && (
                        <Flex justifyContent="center">
                            <Button variant="link" colorScheme="blue" size="sm">
                                Forgot password?
                            </Button>
                        </Flex>
                    )}
                </Flex>
            </Flex>
        </Flex>
    );
};

export default Login;