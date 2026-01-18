import React from 'react';
import {
  Flex,
  Heading,
  Input,
  Button,
  FormControl,
  FormLabel,
  Switch,
  useColorModeValue,
} from '@chakra-ui/react';

const Login = () => {
  const formBackground = useColorModeValue('gray.100', 'gray.700');
  const [isLogin, setIsLogin] = React.useState(true);

  return (
    <Flex h="90vh" alignItems="center" justifyContent="center">
            <Flex
                    flexDirection="row"
                    bg={formBackground}
                    borderRadius={20}
                    boxShadow="lg"
                    w="100%"
                    maxW="900px"
                    h="500px"
            >
                    <Flex
                            flex={1}
                            borderRadius="100px 0 0 100px"
                            alignItems="center"
                            justifyContent="center"
                    >
                            <img src="https://avalonhollywood.com/wp-content/uploads/2024/08/hollywood-nightlife-event-concert-calendar.webp" alt="Login" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px 0 0 20px' }} />
                    </Flex>
                    <Flex
                            flex={1}
                            flexDirection="column"
                            p={50}
                            justifyContent="center"
                    >
                            <Heading align="center" mb={5}>{isLogin ? 'Log In' : 'Create Account'}</Heading>
                            {!isLogin && (
                                    <Input
                                            placeholder="Email"
                                            type="email"
                                            variant="filled"
                                            mb={3}
                                    />
                            )}
                            <Input
                                    placeholder="Username"
                                    type="text"
                                    variant="filled"
                                    mb={3}
                            />
                            <Input
                                    placeholder="Password"
                                    type="password"
                                    variant="filled"
                                    mb={6}
                            />
                            <Button bgGradient="linear(to-r, blue.500, blue.600)" color="white" mb={8}>
                                    {isLogin ? 'Log In' : 'Create Account'}
                            </Button>
                            <Flex justifyContent="center" mb={4}>
                                    <Button
                                            variant="link"
                                            colorScheme="blue"
                                            size="sm"
                                            onClick={() => setIsLogin(!isLogin)}
                                    >
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