import { FastifyInstance } from 'fastify';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import prisma from '../db';

const UPLOADS_DIR = join(__dirname, '../../uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

const EVENT_INCLUDE = {
  createdBy: true,
  _count: { select: { rsvps: { where: { status: 'going' } } } },
} as const;

function formatEvent(event: any) {
  const { _count, ...rest } = event;
  return { ...rest, goingCount: _count?.rsvps ?? 0 };
}

export default async function eventRoutes(app: FastifyInstance) {
  // GET /events — list all events
  app.get('/events', async () => {
    const events = await prisma.event.findMany({
      orderBy: { date: 'asc' },
      include: EVENT_INCLUDE,
    });
    return events.map(formatEvent);
  });

  // GET /events/:id — get single event
  app.get<{ Params: { id: string } }>('/events/:id', async (req, reply) => {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: EVENT_INCLUDE,
    });
    if (!event) return reply.status(404).send({ error: 'Event not found' });
    return formatEvent(event);
  });

  // POST /events — create event
  app.post<{
    Body: {
      name: string;
      description: string;
      date: string;
      category: string;
      capacity?: number;
      authorName?: string;
      address: string;
      latitude: number;
      longitude: number;
      createdByUserId?: string;
      eventPhotoBase64?: string;
      eventPhotoExt?: string;
    };
  }>('/events', async (req, reply) => {
    const { eventPhotoBase64, eventPhotoExt, ...rest } = req.body;

    let eventPhoto = '';
    if (eventPhotoBase64) {
      const ext = eventPhotoExt ?? 'jpg';
      const filename = `${randomUUID()}.${ext}`;
      const buffer = Buffer.from(eventPhotoBase64, 'base64');
      writeFileSync(join(UPLOADS_DIR, filename), buffer);
      eventPhoto = `uploads/${filename}`;
    }

    const event = await prisma.event.create({
      data: {
        ...rest,
        date: new Date(rest.date),
        eventPhoto,
      },
    });
    return reply.status(201).send(event);
  });

  // PATCH /events/:id — update event
  app.patch<{
    Params: { id: string };
    Body: Partial<{
      name: string;
      description: string;
      date: string;
      category: string;
      capacity: number;
      attendeeCount: number;
      authorName: string;
      address: string;
      latitude: number;
      longitude: number;
    }>;
  }>('/events/:id', async (req, reply) => {
    const { date, ...rest } = req.body;
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        ...rest,
        ...(date ? { date: new Date(date) } : {}),
      },
    });
    return event;
  });

  // DELETE /events/:id — delete event
  app.delete<{ Params: { id: string } }>('/events/:id', async (req, reply) => {
    await prisma.event.delete({ where: { id: req.params.id } });
    return reply.status(204).send();
  });

  // GET /events/:id/rsvp?userId= — get user's RSVP status for an event
  app.get<{ Params: { id: string }; Querystring: { userId: string } }>(
    '/events/:id/rsvp',
    async (req, reply) => {
      const { id } = req.params;
      const { userId } = req.query;
      if (!userId) return reply.status(400).send({ error: 'userId required' });
      const rsvp = await prisma.eventRsvp.findUnique({
        where: { userId_eventId: { userId, eventId: id } },
      });
      return { status: rsvp?.status ?? null };
    }
  );

  // POST /events/:id/rsvp — upsert RSVP (going | interested)
  app.post<{
    Params: { id: string };
    Body: { userId: string; status: 'going' | 'interested' };
  }>('/events/:id/rsvp', async (req, reply) => {
    const { id } = req.params;
    const { userId, status } = req.body;
    const rsvp = await prisma.eventRsvp.upsert({
      where: { userId_eventId: { userId, eventId: id } },
      create: { userId, eventId: id, status },
      update: { status },
    });
    return rsvp;
  });

  // DELETE /events/:id/rsvp — remove RSVP
  app.delete<{
    Params: { id: string };
    Querystring: { userId: string };
  }>('/events/:id/rsvp', async (req, reply) => {
    const { id } = req.params;
    const { userId } = req.query;
    if (!userId) return reply.status(400).send({ error: 'userId required' });
    await prisma.eventRsvp.deleteMany({ where: { userId, eventId: id } });
    return reply.status(204).send();
  });
}
