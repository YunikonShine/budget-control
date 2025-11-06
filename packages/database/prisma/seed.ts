import { PrismaClient } from "../generated/prisma/index.js";
const prisma = new PrismaClient();

async function main() {
  const todo = await prisma.column.create({
    data: { name: 'To do', order: 1 }
  });
  const doing = await prisma.column.create({
    data: { name: 'Doing', order: 2 }
  });
  const done = await prisma.column.create({
    data: { name: 'Done', order: 3 }
  });
  await prisma.card.createMany({
    data: [
      { columnId: todo.id, title: 'Briefing', order: 0 },
      { columnId: todo.id, title: 'Wireframes', order: 1 },
      { columnId: doing.id, title: 'Landing page', order: 0 }
    ]
  });

  console.log('Seed completed');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
