"use client";

import { useActionState } from "react";
import { loginUser } from "@/app/actions/auth";
import Link from "next/link";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginUser, null);

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: 'var(--bg-main)' 
    }}>
      <div className="card" style={{ width: '400px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="logo-circle" style={{ margin: '0 auto 12px', background: 'var(--ufar-blue)', color: 'white' }}>U</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Log in to your UFARnet account</p>
        </div>

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>University Email</label>
            <input name="email" type="email" className="search-input" style={{ width: '100%', background: '#f0f2f5', color: 'black' }} placeholder="student@ufar.com" required />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Password</label>
            <input name="password" type="password" className="search-input" style={{ width: '100%', background: '#f0f2f5', color: 'black' }} placeholder="••••••••" required />
          </div>

          {state?.error && (
            <div style={{ color: 'var(--ufar-red)', fontSize: '0.85rem', textAlign: 'center', background: '#ffebee', padding: '8px', borderRadius: '4px' }}>
              {state.error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isPending}
            style={{ padding: '12px', marginTop: '8px' }}
          >
            {isPending ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
          Don't have an account? <Link href="/register" style={{ color: 'var(--ufar-blue)', fontWeight: '600' }}>Register here</Link>
        </div>
      </div>
    </div>
  );
}