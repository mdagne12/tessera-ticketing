import React from 'react';
import { Box, Flex, Text, Button, Spacer } from '@chakra-ui/react';
import { Icon } from '@chakra-ui/react'
import { BsPersonCircle } from "react-icons/bs";
import { useNavigate } from 'react-router-dom';
import '@fontsource/dm-serif-display';
import { useEffect } from 'react';

function Navbar() {
  const navigate = useNavigate();
  const [profile_route, setProfileRoute] = React.useState('');

  useEffect(() => {
          const getUserAuth = async () => {
              try {
                  const token = localStorage.getItem('access_token');
  
                  if (!token) {
                      setProfileRoute('/login');
                  }
  
                  const response = await fetch('http://localhost:5000/auth/check', {
                  method: 'GET',
                  headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                  },
                  });
  
                  if (!response.ok) {
                      setProfileRoute('/login');
                  } else {
                      setProfileRoute('/profile');
                  }
  
              } catch (error) {
                  navigate('/login');
              }
          };
  
          getUserAuth();
      }, []);

  const navigate_to_profile = () => {
    navigate(profile_route);
  };

  const navigate_to_home = () => {
    navigate('/events');
  }
  
  return (
    <Flex bgGradient="linear(to-r, blue.500, blue.600)" color="white" p="2" alignItems="center">
      <Box p="1">
        <Text 
          fontStyle="italic"
          fontSize="3xl" fontWeight="bold" onClick={navigate_to_home}>
            Tessera Events
        </Text>
      </Box>
      <Spacer />
      <Box onClick={navigate_to_profile} cursor="pointer"> 
        <Icon as={BsPersonCircle} boxSize="9" />
      </Box>
    </Flex>
  );
}

export default Navbar;