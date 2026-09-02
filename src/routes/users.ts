import { FastifyInstance } from 'fastify';
import prisma from '../db';

export default async function userRoutes(app: FastifyInstance) {
  // GET /users
  app.get('/users', async () => {
    return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  });

  // GET /users/:id
  app.get<{ Params: { id: string } }>('/users/:id', async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { events: { orderBy: { date: 'asc' } } },
    });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    return user;
  });

  // POST /users
  app.post<{
    Body: { userFullName: string; username: string };
  }>('/users', async (req, reply) => {
    const existing = await prisma.user.findUnique({ where: { username: req.body.username } });
    if (existing) return reply.status(409).send({ error: 'Username already taken' });
    const user = await prisma.user.create({ data: req.body });
    return reply.status(201).send(user);
  });

  // PATCH /users/:id
  app.patch<{
    Params: { id: string };
    Body: Partial<{ userFullName: string; username: string }>;
  }>('/users/:id', async (req, reply) => {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: req.body,
    });
    return user;
  });

  // GET /users/:id/rsvps?status= — get events a user has RSVP'd to
  app.get<{ Params: { id: string }; Querystring: { status?: string } }>(
    '/users/:id/rsvps',
    async (req, reply) => {
      const rsvps = await prisma.eventRsvp.findMany({
        where: {
          userId: req.params.id,
          ...(req.query.status ? { status: req.query.status } : {}),
        },
        include: {
          event: {
            include: {
              createdBy: true,
              _count: { select: { rsvps: { where: { status: 'going' } } } },
            },
          },
        },
        orderBy: { event: { date: 'asc' } },
      });
      return rsvps.map((r) => {
        const { _count, ...rest } = r.event;
        return { ...rest, goingCount: _count?.rsvps ?? 0 };
      });
    }
  );

  // DELETE /users/:id
  app.delete<{ Params: { id: string } }>('/users/:id', async (req, reply) => {
    await prisma.user.delete({ where: { id: req.params.id } });
    return reply.status(204).send();
  });
}
