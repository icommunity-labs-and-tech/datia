type Props = {
  message?: string;
};

export default function EmptyPlaceholder({
  message = 'No hay elementos para mostrar en esta tabla.',
}: Props) {
  return (
    <div className="text-center text-muted py-4">
      <strong>Sin resultados</strong>
      <div className="mt-1">{message}</div>
    </div>
  );
}
