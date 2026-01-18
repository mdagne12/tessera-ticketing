import React from 'react';
import { Box, Flex, Text, Button, Spacer } from '@chakra-ui/react';
import { Icon } from '@chakra-ui/react'
import { BsPersonCircle } from "react-icons/bs";
import { useNavigate } from 'react-router-dom';
import '@fontsource/dm-serif-display';

function Navbar() {
  const navigate = useNavigate();

  const navigate_to_login = () => {
  navigate('/login');
  };

  const navigate_to_home = () => {
    navigate('/events');
  }
  
  return (
    <Flex bgGradient="linear(to-r, blue.500, blue.600)" color="white" p="1" alignItems="center">
      <Box p="2">
        <Text 
          style={{ fontFamily: '"DM Serif Display", serif', fontWeight: 400, letterSpacing: '1px' }}
          fontSize="3xl" fontWeight="bold" onClick={navigate_to_home}>
            Tessera Events
        </Text>
      </Box>
      <Spacer />
      <Box onClick={navigate_to_login} cursor="pointer"> 
        <Icon as={BsPersonCircle} boxSize="9" />
      </Box>
    </Flex>
  );
}

export default Navbar;