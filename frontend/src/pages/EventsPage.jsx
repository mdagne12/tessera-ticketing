import React, { useEffect, useState } from 'react';
import { SimpleGrid, Container } from '@chakra-ui/react';
import EventCard from '../components/EventCard';

function EventsPage() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/events')
      .then(response => response.json())
      .then(setEvents)
      .catch(error => console.error('Error fetching events:', error));
  }, []);

  return (
    <Container maxW="container.xl" centerContent>
      <SimpleGrid columns={{ sm: 1, md: 2, lg: 3 }} spacing={10} py={5}>
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
    </Container>
  );
}

export default EventsPage;