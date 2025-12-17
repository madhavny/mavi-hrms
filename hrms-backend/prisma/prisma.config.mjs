import 'dotenv/config';
import path from 'path';

export default {
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'schema.prisma'),
  datasource: {
    sourceType: 'envVar',
    value: 'DATABASE_URL',
  },
};
