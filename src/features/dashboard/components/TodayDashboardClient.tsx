"use client";

import React from "react";
import Link from "next/link";
import UiIcon from "@/shared/ui/UiIcon";
import Image from "next/image";

type DashboardData = {
  mySchedule: any[];
  upcomingDeadlines: any[];
  newMaterials: any[];
  pinnedAnnouncements: any[];
  eventsThisWeek: any[];
  myCommunities: any[];
};

export default function TodayDashboardClient({ data }: { data: DashboardData }) {
  const {
    mySchedule,
    upcomingDeadlines,
    newMaterials,
    pinnedAnnouncements,
    eventsThisWeek,
    myCommunities,
  } = data;

  const todayStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="dashboard-container" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 8px' }}>Today&apos;s Campus Hub</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '16px' }}>{todayStr}</p>
      </header>

      {/* Pinned Announcements */}
      {pinnedAnnouncements.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <UiIcon name="bell" size={20} /> Campus Announcements
          </h2>
          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '10px' }}>
            {pinnedAnnouncements.map((announcement: any) => (
              <div key={announcement.id} className="card" style={{ minWidth: '320px', flex: '0 0 auto', padding: '16px', borderLeft: '4px solid var(--brand)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  {announcement.authorImage ? (
                    <Image src={announcement.authorImage} alt={announcement.authorName} width={32} height={32} style={{ borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--brand)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {announcement.authorName.charAt(0)}
                    </div>
                  )}
                  <span style={{ fontWeight: '500' }}>{announcement.authorName}</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '14px', lineHeight: '1.5' }}>{announcement.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Schedule & Deadlines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section className="card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', marginTop: 0 }}>
              <UiIcon name="building" size={20} /> Today&apos;s Schedule
            </h2>
            {mySchedule.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {mySchedule.slice(0, 3).map((item: any) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--bg-wash)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.courseName}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Room: {item.room || "TBA"}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: '600', color: 'var(--brand)' }}>
                      {item.startTime}
                    </div>
                  </div>
                ))}
                <Link href="/schedule" style={{ textAlign: 'center', fontSize: '14px', color: 'var(--brand)', marginTop: '12px', display: 'inline-block', fontWeight: '500', textDecoration: 'none' }}>View Full Schedule →</Link>
              </div>
            ) : (
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-wash)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p style={{ margin: 0, fontSize: '14px' }}>No classes scheduled for today.</p>
                <Link href="/schedule" style={{ color: 'var(--brand)', display: 'inline-block', marginTop: '8px', fontSize: '14px', textDecoration: 'none' }}>Manage Schedule</Link>
              </div>
            )}
          </section>

          <section className="card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', marginTop: 0 }}>
              <UiIcon name="clock" size={20} /> Upcoming Deadlines
            </h2>
            {upcomingDeadlines.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingDeadlines.map((item: any) => (
                  <div key={item.id} style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '8px', borderLeft: '4px solid #ffc107' }}>
                    <div style={{ fontWeight: '600', color: '#856404' }}>{item.title}</div>
                    <div style={{ fontSize: '13px', color: '#856404', opacity: 0.8, marginTop: '4px' }}>Due: {new Date(item.dueDate).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-wash)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <UiIcon name="check-circle" size={24} className="mx-auto text-success mb-2" />
                <p style={{ margin: 0, fontSize: '14px' }}>You&apos;re all caught up!</p>
              </div>
            )}
          </section>
        </div>

        {/* Materials & Events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section className="card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', marginTop: 0 }}>
              <UiIcon name="folder" size={20} /> New Materials
            </h2>
            {newMaterials.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {newMaterials.map((item: any) => (
                  <Link key={item.id} href={`/study-materials`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-wash)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ padding: '8px', backgroundColor: 'var(--brand-light)', color: 'var(--brand)', borderRadius: '8px' }}>
                      <UiIcon name="file" size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{item.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.course || "General"}</div>
                    </div>
                  </Link>
                ))}
                <Link href="/study-materials" style={{ textAlign: 'center', fontSize: '14px', color: 'var(--brand)', marginTop: '8px', display: 'inline-block', fontWeight: '500', textDecoration: 'none' }}>Browse all materials →</Link>
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, textAlign: 'center', padding: '16px' }}>No new materials.</p>
            )}
          </section>

          <section className="card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', marginTop: 0 }}>
              <UiIcon name="calendar" size={20} /> Events This Week
            </h2>
            {eventsThisWeek.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {eventsThisWeek.map((item: any) => (
                  <Link key={item.id} href={`/events/${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: 'var(--bg-wash)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
                    {item.coverThumbnailUrl ? (
                      <Image src={item.coverThumbnailUrl} alt={item.title} width={48} height={48} style={{ borderRadius: '8px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 48, height: 48, backgroundColor: 'var(--brand-light)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand)' }}>
                        <UiIcon name="calendar" size={24} />
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{item.title}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {new Date(item.startTime).toLocaleDateString()}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0, textAlign: 'center', padding: '16px' }}>No upcoming events this week.</p>
            )}
          </section>
        </div>

      </div>
    </div>
  );
}
