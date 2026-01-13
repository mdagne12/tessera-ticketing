import React from 'react';
import { Box, Flex, Text, Button, Spacer } from '@chakra-ui/react';

function Navbar() {
  return (
    <Flex bgGradient="linear(to-r, teal.600, blue.600)" color="white" p="4" alignItems="center">
      <Box p="2">
        <Text fontFamily="Helvetica" fontSize="2xl" fontWeight="bold">Tessera Events</Text>
      </Box>
      <Spacer />
      <Box>
        <Button colorScheme="blue" variant="outline">Profile</Button>
      </Box>
    </Flex>
  );
}

export default Navbar;