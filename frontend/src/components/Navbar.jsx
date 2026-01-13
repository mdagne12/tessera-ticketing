import React from 'react';
import { Box, Flex, Text, Button, Spacer } from '@chakra-ui/react';
import { Icon } from '@chakra-ui/react'
import { BsPersonCircle } from "react-icons/bs";

function Navbar() {
  return (
    <Flex bgGradient="linear(to-r, teal.600, blue.600)" color="white" p="4" alignItems="center">
      <Box p="2">
        <Text fontFamily="Helvetica" fontSize="2xl" fontWeight="bold">Tessera Events</Text>
      </Box>
      <Spacer />
      <Box>
        <Icon as={BsPersonCircle} boxSize="9" />
      </Box>
    </Flex>
  );
}

export default Navbar;