import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Heading,
  Text,
  Image,
  VStack,
  HStack,
  Card,
  CardBody,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  Divider,
  Badge,
  Button,
  useToast,
  Tooltip,
} from '@chakra-ui/react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Replace with your Stripe publishable key
const stripePromise = loadStripe('pk_test_your_publishable_key_here');

function CheckoutForm({ selectedSeats, seatAvailability, eventId, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const toast = useToast();

  const getToken = () => localStorage.getItem('access_token');

  const calculateTotal = () => {
    let total = 0;
    selectedSeats.forEach(seatId => {
      const [rowName, seatNumber] = seatId.split('-');
      const price = seatAvailability[rowName]?.[seatNumber]?.price || 0;
      total += parseFloat(price);
    });
    return total;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (selectedSeats.length === 0) {
      toast({
        title: 'No seats selected',
        description: 'Please select at least one seat',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setProcessing(true);

    try {
      const total = calculateTotal();
      const amountInCents = Math.round(total * 100);

      // Create payment intent
      const token = getToken();
      const paymentIntentResponse = await fetch('http://localhost:5000/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ amount: amountInCents })
      });

      if (!paymentIntentResponse.ok) {
        throw new Error('Failed to create payment intent');
      }

      const { clientSecret } = await paymentIntentResponse.json();

      // Confirm payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent.status === 'succeeded') {
        // Complete purchase on backend
        const completeResponse = await fetch('http://localhost:5000/complete-purchase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            seats: selectedSeats.map(seatId => {
              const [rowName, seatNumber] = seatId.split('-');
              return {
                event_id: eventId,
                row_name: rowName,
                seat_number: parseInt(seatNumber)
              };
            })
          })
        });

        if (!completeResponse.ok) {
          throw new Error('Failed to complete purchase');
        }

        toast({
          title: 'Payment successful!',
          description: 'Your seats have been purchased',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });

        onSuccess();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setProcessing(false);
    }
  };

  const total = calculateTotal();

  return (
    <form onSubmit={handleSubmit}>
      <VStack spacing={4} align="stretch">
        <Box>
          <Text fontWeight="semibold" mb={2}>Payment Details</Text>
          <Box p={3} border="1px" borderColor="gray.200" borderRadius="md">
            <CardElement 
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
                  },
                },
              }}
            />
          </Box>
        </Box>

        <Divider />

        <HStack justify="space-between">
          <Text fontWeight="bold">Total:</Text>
          <Text fontWeight="bold" fontSize="xl">${total.toFixed(2)}</Text>
        </HStack>

        <Button
          type="submit"
          colorScheme="blue"
          size="lg"
          isLoading={processing}
          isDisabled={!stripe || processing || selectedSeats.length === 0}
        >
          Pay ${total.toFixed(2)}
        </Button>
      </VStack>
    </form>
  );
}

function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [seatAvailability, setSeatAvailability] = useState({});
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatLoading, setSeatLoading] = useState(false);
  const toast = useToast();

  const getToken = () => {
    return localStorage.getItem('access_token');
  };

  const getUserId = () => {
    const token = getToken();
    if (!token) return null;
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload);
      return decoded.sub || decoded.identity || decoded.user_id;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const response = await fetch(`http://localhost:5000/events/${id}`);
        
        if (!response.ok) {
          throw new Error('Event not found');
        }
        
        const data = await response.json();
        setEvent(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const token = getToken();
        
        if (!token) {
          throw new Error('No authentication token found. Please log in.');
        }
        
        const response = await fetch(`http://localhost:5000/get_ticket_availability/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch seat availability`);
        }
        
        const data = await response.json();
        setSeatAvailability(data);
      } catch (err) {
        console.error('Error fetching seats:', err);
        toast({
          title: 'Error',
          description: err.message || 'Failed to load seat availability',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    };

    if (id) {
      fetchSeats();
    }
  }, [id, toast]);

  useEffect(() => {
    if (!event?.date || !event?.time) return;

    const updateTimer = () => {
      const eventDate = new Date(event.date + " " + event.time).getTime();
      const now = new Date().getTime();
      const distance = eventDate - now;

      if (distance < 0) {
        setTimeLeft('Event has started');
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const timerId = setInterval(updateTimer, 1000);

    return () => clearInterval(timerId);
  }, [event]);

  // Handle seat click
const handleSeatClick = async (rowName, seatNumber, status, price) => {
  if (status === 'SOLD') return;
  
  const seatId = `${rowName}-${seatNumber}`;
  const isSelected = selectedSeats.includes(seatId);

  setSeatLoading(true);
  try {
    const token = localStorage.getItem('access_token');
    const userId = getUserId();
    
    console.log('Token:', token);
    console.log('User ID:', userId);
    
    if (!token || !userId) {
      throw new Error('No authentication token found. Please log in.');
    }
    
    const endpoint = isSelected ? 'unreserve_seat' : 'reserve_seat';
    const url = `http://localhost:5000/${endpoint}/${event.event_id}/${rowName}/${seatNumber}/${userId}`;
    
    console.log('Calling URL:', url);
    console.log('Method: PUT');
    console.log('Headers:', { 'Authorization': `Bearer ${token}` });
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Response status:', response.status);
    const responseData = await response.json();
    console.log('Response data:', responseData);
    
    if (!response.ok) {
      throw new Error(responseData.error || `Failed to ${isSelected ? 'unreserve' : 'reserve'} seat`);
    }

    // Update local state
    if (isSelected) {
      setSelectedSeats(prev => prev.filter(s => s !== seatId));
      setSeatAvailability(prev => ({
        ...prev,
        [rowName]: {
          ...prev[rowName],
          [seatNumber]: { ...prev[rowName][seatNumber], status: 'AVAILABLE' }
        }
      }));
    } else {
      setSelectedSeats(prev => [...prev, seatId]);
      setSeatAvailability(prev => ({
        ...prev,
        [rowName]: {
          ...prev[rowName],
          [seatNumber]: { ...prev[rowName][seatNumber], status: 'RESERVED' }
        }
      }));
    }
    
    toast({
      title: isSelected ? 'Seat unreserved' : 'Seat reserved',
      description: `Seat ${rowName}-${seatNumber} has been ${isSelected ? 'unreserved' : 'reserved'}`,
      status: isSelected ? 'info' : 'success',
      duration: 2000,
      isClosable: true,
    });
  } catch (error) {
    console.error('Error:', error);
    toast({
      title: 'Error',
      description: error.message,
      status: 'error',
      duration: 3000,
      isClosable: true,
    });
  } finally {
    setSeatLoading(false);
  }
};

  const handlePaymentSuccess = () => {
    // Clear selected seats and refresh availability
    setSelectedSeats([]);
    
    // Refresh seat availability
    const fetchSeats = async () => {
      try {
        const token = getToken();
        const response = await fetch(`http://localhost:5000/get_ticket_availability/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSeatAvailability(data);
        }
      } catch (err) {
        console.error('Error refreshing seats:', err);
      }
    };
    
    fetchSeats();
  };

  const Seat = ({ rowName, seatNumber, seatData }) => {
    const seatId = `${rowName}-${seatNumber}`;
    const isSelected = selectedSeats.includes(seatId);
    const status = seatData.status;
    const price = seatData.price || 'N/A';
    
    let bgColor = 'green.400';
    let hoverColor = 'green.500';
    let cursor = 'pointer';
    let tooltipLabel = `$${price} - Available - Click to reserve`;
    
    if (status === 'RESERVED' && !isSelected) {
      bgColor = 'red.400';
      hoverColor = 'red.400';
      cursor = 'not-allowed';
      tooltipLabel = `$${price} - Reserved by another user`;
    } else if (status === 'SOLD') {
      bgColor = 'gray.400';
      hoverColor = 'gray.400';
      cursor = 'not-allowed';
      tooltipLabel = `$${price} - Sold`;
    } else if (isSelected) {
      bgColor = 'blue.500';
      hoverColor = 'blue.600';
      tooltipLabel = `$${price} - Your reservation - Click to unreserve`;
    }

    return (
      <Tooltip label={tooltipLabel} hasArrow>
        <Button
          size="sm"
          bg={bgColor}
          color="white"
          _hover={{ bg: hoverColor }}
          cursor={cursor}
          onClick={() => handleSeatClick(rowName, seatNumber, status, price)}
          isDisabled={seatLoading || (status === 'RESERVED' && !isSelected) || status === 'SOLD'}
          minW="40px"
          h="40px"
        >
          {seatNumber}
        </Button>
      </Tooltip>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="100vh">
        <VStack spacing={4}>
          <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
          <Text fontSize="xl">Loading event...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box maxW="container.md" mx="auto" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertTitle>Error: {error}</AlertTitle>
        </Alert>
      </Box>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" p={8}>
      <Box maxW="1400px" mx="auto" display="flex" gap={8}>
        {/* Left Card - Event Details */}
        <Card w="40%" maxW="600px">
          <CardBody p={0}>
            <VStack align="stretch" spacing={0}>
              <Box w="100%" h="300px" overflow="hidden" borderTopRadius="md" bg="gray.100">
                <Image
                  src={event.image_url || '/placeholder-event.jpg'}
                  alt={event.name}
                  w="100%"
                  h="100%"
                  objectFit="cover"
                  borderTopRadius="md"
                />
              </Box>

              <Box p={6}>
                <Heading as="h1" size="lg" mb={3}>
                  {event.name}
                </Heading>
                
                <Text fontSize="sm" color="gray.700" mb={4}>
                  {event.description}
                </Text>
                
                <Divider mb={4} />
                
                <VStack align="stretch" spacing={3}>
                  <Box>
                    <Text fontWeight="semibold" color="gray.600" fontSize="xs" mb={1}>
                      Date
                    </Text>
                    <Text fontSize="md">{event.date}</Text>
                  </Box>
                  
                  <Box>
                    <Text fontWeight="semibold" color="gray.600" fontSize="xs" mb={1}>
                      Time
                    </Text>
                    <Text fontSize="md">{event.time}</Text>
                  </Box>

                  {event.location && (
                    <Box>
                      <Text fontWeight="semibold" color="gray.600" fontSize="xs" mb={1}>
                        Location
                      </Text>
                      <Text fontSize="md">{event.location}</Text>
                    </Box>
                  )}
                </VStack>
                
                <Divider my={4} />
                
                <Box textAlign="center" py={3}>
                  <Text fontWeight="semibold" color="gray.600" mb={2} fontSize="xs">
                    Event starts in:
                  </Text>
                  <Badge
                    fontSize="lg"
                    colorScheme="blue"
                    px={4}
                    py={2}
                    borderRadius="md"
                  >
                    {timeLeft}
                  </Badge>
                </Box>
              </Box>
            </VStack>
          </CardBody>
        </Card>

        {/* Right Side - Seating Chart and Payment */}
        <Box flex="1">
          <VStack spacing={6} align="stretch">
            {/* Seating Chart */}
            <Card>
              <CardBody>
                <VStack align="stretch" spacing={4}>
                  <Heading size="md">Select Your Seats</Heading>
                  
                  <HStack spacing={4} fontSize="sm">
                    <HStack>
                      <Box w="20px" h="20px" bg="green.400" borderRadius="sm" />
                      <Text>Available</Text>
                    </HStack>
                    <HStack>
                      <Box w="20px" h="20px" bg="blue.500" borderRadius="sm" />
                      <Text>Your Selection</Text>
                    </HStack>
                    <HStack>
                      <Box w="20px" h="20px" bg="red.400" borderRadius="sm" />
                      <Text>Reserved</Text>
                    </HStack>
                    <HStack>
                      <Box w="20px" h="20px" bg="gray.400" borderRadius="sm" />
                      <Text>Sold</Text>
                    </HStack>
                  </HStack>

                  {Object.keys(seatAvailability).length > 0 ? (
                    <VStack align="stretch" spacing={3} mt={4}>
                      {Object.keys(seatAvailability).sort().map((rowName) => (
                        <HStack key={rowName} spacing={2}>
                          <Text fontWeight="bold" minW="30px">{rowName}</Text>
                          <HStack spacing={2}>
                            {Object.keys(seatAvailability[rowName])
                              .sort((a, b) => parseInt(a) - parseInt(b))
                              .map((seatNumber) => (
                                <Seat
                                  key={`${rowName}-${seatNumber}`}
                                  rowName={rowName}
                                  seatNumber={seatNumber}
                                  seatData={seatAvailability[rowName][seatNumber]}
                                />
                              ))}
                          </HStack>
                        </HStack>
                      ))}
                    </VStack>
                  ) : (
                    <Box textAlign="center" py={8}>
                      <Spinner />
                      <Text mt={4}>Loading seats...</Text>
                    </Box>
                  )}
                  
                  {selectedSeats.length > 0 && (
                    <Box mt={4} p={4} bg="blue.50" borderRadius="md">
                      <Text fontWeight="semibold">
                        Selected Seats ({selectedSeats.length}): {selectedSeats.join(', ')}
                      </Text>
                    </Box>
                  )}
                </VStack>
              </CardBody>
            </Card>

            {/* Payment Section */}
            {selectedSeats.length > 0 && (
              <Card>
                <CardBody>
                  <Heading size="md" mb={4}>Checkout</Heading>
                  <Elements stripe={stripePromise}>
                    <CheckoutForm 
                      selectedSeats={selectedSeats}
                      seatAvailability={seatAvailability}
                      eventId={event.event_id}
                      onSuccess={handlePaymentSuccess}
                    />
                  </Elements>
                </CardBody>
              </Card>
            )}
          </VStack>
        </Box>
      </Box>
    </Box>
  );
}

export default EventDetail;