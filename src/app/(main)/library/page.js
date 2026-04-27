const items = [
  ["Course archive", "Shared files and old materials"],
  ["Book requests", "Ask students for books"],
  ["Useful links", "University resources"],
];

export default function LibraryPage() {
  return (
    <section className="card old-page">
      <h1>Library</h1>
      <p>Saved materials and useful files.</p>

      <div className="old-list">
        {items.map(([name, info]) => (
          <div className="old-list-item" key={name}>
            <div className="old-avatar">▤</div>
            <div>
              <strong>{name}</strong>
              <span>{info}</span>
            </div>
            <button>View</button>
          </div>
        ))}
      </div>
    </section>
  );
}