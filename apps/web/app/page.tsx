import KanbanBoard from "../components/kanban/KanbanBoard";

export default function Page() {
  return (
    <main className="container mx-auto">
      <h1 className="text-2xl font-bold mb-4">Projeto – Kanban</h1>
      <KanbanBoard />
    </main>
  );
}
