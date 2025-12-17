import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create Super Admin
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: 'admin@mavihrms.com' },
    update: {},
    create: {
      email: 'admin@mavihrms.com',
      password: hashedPassword,
      name: 'Super Admin',
      isActive: true,
    },
  });

  console.log('Super Admin created:', superAdmin.email);

  // Create default permissions
  const modules = [
    'dashboard', 'employees', 'attendance', 'leave', 'payroll',
    'recruitment', 'training', 'assets', 'helpdesk', 'reports', 'settings'
  ];
  const actions = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

  for (const module of modules) {
    for (const action of actions) {
      await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: { module, action, description: `${action} ${module}` },
      });
    }
  }

  console.log('Permissions seeded');
  console.log('Seed completed!');
  console.log('');
  console.log('Super Admin Credentials:');
  console.log('Email: admin@mavihrms.com');
  console.log('Password: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
