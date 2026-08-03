import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const eventId = "30e01083-d93d-4c3d-bc8f-287714fc04d7"; // Just need to fetch ANY attendee to check structure
  const attendees = await prisma.attendee.findMany({
    take: 5,
    include: {
      invitation: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log("Attendees count:", attendees.length);
  if (attendees.length > 0) {
    console.log("First attendee sample:", JSON.stringify(attendees[0], null, 2));
  }
  
  await prisma.$disconnect();
}

test().catch(console.error);
