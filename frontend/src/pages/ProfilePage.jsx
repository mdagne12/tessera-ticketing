import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Card,
  CardBody,
  CardHeader,
  Container,
  Heading,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

function ProfileCard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    avatar_url: '',
  });

  useEffect(() => {
    const getUserProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');

        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch('http://localhost:5000/auth/check', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Unauthorized');
        }

        const data = await response.json();

        setProfile({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          username: data.username,
          avatar: data.avatar,
        });
      } catch (error) {
        navigate('/login');
      }
    };

    getUserProfile();
  }, [navigate]);

  return (
    <Container maxW="md" py={20}>
      <Card bgGradient="linear(to-br, blue.500, blue.600)" boxShadow="lg">
        <CardHeader mb={-5} textAlign="center">
          <Avatar
            size="xl"
            mb={4}
            name={`${profile.first_name} ${profile.last_name}`}
            src={profile.avatar}
            borderWidth={5}
            borderColor="blue.300"
          />
          <Heading size="md" color="white">
            {profile.first_name} {profile.last_name}
          </Heading>
          <Text color="blue.300">@{profile.username}</Text>

        </CardHeader>

        <CardBody>
          <Stack spacing={3}>
            <Text color="white">
              <strong>Email:</strong> {profile.email}
            </Text>
            <Text color="white">
              <strong>Username:</strong> {profile.username}
            </Text>
          </Stack>
        </CardBody>
      </Card>
    </Container>
  );
}

export default ProfileCard;

