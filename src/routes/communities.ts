import { FastifyInstance } from 'fastify';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import prisma from '../db';

const UPLOADS_DIR = join(__dirname, '../../uploads');
mkdirSync(UPLOADS_DIR, { recursive: true });

const COMMUNITY_INCLUDE = {
  createdBy: true,
  _count: { select: { members: true } },
} as const;

function formatCommunity(c: any) {
  const { _count, ...rest } = c;
  return { ...rest, memberCount: _count?.members ?? 0 };
}

export default async function communityRoutes(app: FastifyInstance) {
  // GET /communities
  app.get('/communities', async () => {
    const communities = await prisma.community.findMany({
      orderBy: { createdAt: 'desc' },
      include: COMMUNITY_INCLUDE,
    });
    return communities.map(formatCommunity);
  });

  // GET /communities/:id
  app.get<{ Params: { id: string } }>('/communities/:id', async (req, reply) => {
    const c = await prisma.community.findUnique({
      where: { id: req.params.id },
      include: COMMUNITY_INCLUDE,
    });
    if (!c) return reply.status(404).send({ error: 'Community not found' });
    return formatCommunity(c);
  });

  // POST /communities
  app.post<{
    Body: {
      name: string;
      bio: string;
      latitude: number;
      longitude: number;
      createdByUserId?: string;
      communityPhotoBase64?: string;
      communityPhotoExt?: string;
    };
  }>('/communities', async (req, reply) => {
    const { communityPhotoBase64, communityPhotoExt, ...rest } = req.body;

    let communityPhoto = '';
    if (communityPhotoBase64) {
      const ext = communityPhotoExt ?? 'jpg';
      const filename = `${randomUUID()}.${ext}`;
      const buffer = Buffer.from(communityPhotoBase64, 'base64');
      writeFileSync(join(UPLOADS_DIR, filename), buffer);
      communityPhoto = `uploads/${filename}`;
    }

    const community = await prisma.community.create({
      data: { ...rest, communityPhoto },
    });

    // Auto-join creator as a member
    if (rest.createdByUserId) {
      await prisma.communityMember.create({
        data: { userId: rest.createdByUserId, communityId: community.id },
      });
    }

    return reply.status(201).send(formatCommunity({ ...community, _count: { members: rest.createdByUserId ? 1 : 0 } }));
  });

  // POST /communities/:id/join
  app.post<{ Params: { id: string }; Body: { userId: string } }>(
    '/communities/:id/join',
    async (req, reply) => {
      const { id } = req.params;
      const { userId } = req.body;
      await prisma.communityMember.upsert({
        where: { userId_communityId: { userId, communityId: id } },
        create: { userId, communityId: id },
        update: {},
      });
      return reply.status(204).send();
    }
  );

  // DELETE /communities/:id/leave?userId=
  app.delete<{ Params: { id: string }; Querystring: { userId: string } }>(
    '/communities/:id/leave',
    async (req, reply) => {
      const { id } = req.params;
      const { userId } = req.query;
      if (!userId) return reply.status(400).send({ error: 'userId required' });
      await prisma.communityMember.deleteMany({ where: { userId, communityId: id } });
      return reply.status(204).send();
    }
  );
}
