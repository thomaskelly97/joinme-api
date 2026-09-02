import 'dotenv/config';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import eventRoutes from './routes/events';
import userRoutes from './routes/users';
import communityRoutes from './routes/communities';

const app = Fastify({ logger: true, bodyLimit: 10 * 1024 * 1024 }); // 10MB for photo uploads

app.register(fastifyStatic, {
  root: join(__dirname, '../uploads'),
  prefix: '/uploads/',
});

app.register(eventRoutes);
app.register(userRoutes);
app.register(communityRoutes);

app.get('/health', async () => ({ status: 'ok' }));

app.listen({ port: 3001, host: '0.0.0.0' }, (err) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }
});
