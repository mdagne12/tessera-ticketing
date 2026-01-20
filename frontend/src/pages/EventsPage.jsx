import React, { useEffect, useState } from 'react';
import {
  SimpleGrid,
  Container,
  Button,
  HStack,
  Text,
  Input,
  Box,
  Spinner,
} from '@chakra-ui/react';
import EventCard from '../components/EventCard';

const EVENTS_PER_PAGE = 6;

function EventsPage() {
  const [events, setEvents] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const now = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          afterDate: now,
          page: currentPage,
          limit: EVENTS_PER_PAGE,
        });

        if (searchQuery) {
          params.append('search', searchQuery);
        }

        const response = await fetch(
          `http://localhost:5000/events?${params.toString()}`
        );

        const data = await response.json();

        setEvents(data.events);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentPage, searchQuery]);

  return (
    <Container maxW="container.xl" py={8}>
      {/* 🔍 Search Bar */}
      <Box mb={8} maxW="700px" mx="auto">
        <Input
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          borderRadius="full"
          px={6}
          height="48px"
          bg="gray.50"
          borderColor="blue.400"
          _focus={{
            bg: 'white',
            borderColor: 'blue.400',
            boxShadow: '0 0 0 1px var(--chakra-colors-blue-400)',
          }}
        />
      </Box>

      {/* Loading State */}
      {loading && (
        <Box textAlign="center" py={10}>
          <Spinner size="xl" />
        </Box>
      )}

      {/* Events Grid */}
      {!loading && (
        <>
          <SimpleGrid columns={{ sm: 1, md: 2, lg: 3 }} spacing={10}>
            {events.map(event => (
              <EventCard
                key={event.event_id}
                id={event.event_id}
                name={event.name}
                description={event.description}
                date={event.date}
                time={event.time}
                location={event.location}
                imageUrl={event.image_url}
              />
            ))}
          </SimpleGrid>

          {/* Empty State */}
          {events.length === 0 && (
            <Text textAlign="center" mt={10} color="gray.500">
              No events found.
            </Text>
          )}
        </>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && !loading && (
        <HStack spacing={2} justify="center" mt={10}>
          <Button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            isDisabled={currentPage === 1}
          >
            Previous
          </Button>

          {[...Array(totalPages)].map((_, index) => {
            const page = index + 1;
            return (
              <Button
                key={page}
                onClick={() => setCurrentPage(page)}
                colorScheme={page === currentPage ? 'blue' : 'gray'}
                variant={page === currentPage ? 'solid' : 'outline'}
              >
                {page}
              </Button>
            );
          })}

          <Button
            onClick={() =>
              setCurrentPage(p => Math.min(p + 1, totalPages))
            }
            isDisabled={currentPage === totalPages}
          >
            Next
          </Button>
        </HStack>
      )}

      {/* Page Indicator */}
      {totalPages > 1 && !loading && (
        <Text textAlign="center" mt={4} color="gray.600">
          Page {currentPage} of {totalPages}
        </Text>
      )}
    </Container>
  );
}

export default EventsPage;


