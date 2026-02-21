const specialties = [
  { icon: "🏥", title: "Registered Nurse (RN)" },
  { icon: "💊", title: "Licensed Practical Nurse (LPN)" },
  { icon: "🧑‍⚕️", title: "Certified Nursing Assistant (CNA)" },
  { icon: "🚑", title: "Travel Nursing" },
  { icon: "🧠", title: "Allied Health" },
  { icon: "🦴", title: "Physical Therapy" },
];

export default function Specialties() {
  return (
    <section className="specialties">
      <h2 className="specialties-title">Healthcare Specialties We Staff</h2>
      <p className="specialties-subtitle">
        We connect healthcare professionals with facilities nationwide.
      </p>
      <div className="specialties-grid">
        {specialties.map((item, index) => (
          <div key={index} className="specialty-card">
            <span className="specialty-icon" aria-hidden="true">
              {item.icon}
            </span>
            <h3 className="specialty-title">{item.title}</h3>
          </div>
        ))}
      </div>
    </section>
  );
}
