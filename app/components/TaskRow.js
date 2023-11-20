export default function TaskRow({
  title,
  project,
  priority,
  dueDate,
  description,
}) {
  return (
    <tr className="text-left h-14 border-b-2 border-solid border-gray-700">
      <td className="pl-6">{title}</td>
      <td>{project}</td>
      <td>{priority}</td>
    </tr>
  );
}
