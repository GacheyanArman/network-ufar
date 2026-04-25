"use client";

import { useActionState } from "react";
import { registerUser } from "@/app/actions/auth";
import Link from "next/link";

export default function RegisterPage() {
  // Hook to handle server action state (errors, loading)
  const [state, formAction, isPending] = useActionState(registerUser, null);

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
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Join UFARnet</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Use your university email</p>
        </div>

        <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Full Name</label>
            <input name="fullName" type="text" className="search-input" style={{ width: '100%', background: '#f0f2f5', color: 'black' }} placeholder="Gevorg Gacheyan" required />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>University Email</label>
            <input name="email" type="email" className="search-input" style={{ width: '100%', background: '#f0f2f5', color: 'black' }} placeholder="student@ufar.com" required />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', fontWeight: '600' }}>Password</label>
            <input name="password" type="password" className="search-input" style={{ width: '100%', background: '#f0f2f5', color: 'black' }} placeholder="••••••••" required />
          </div>

          {/* ERROR DISPLAY */}
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
            {isPending ? "Creating account..." : "Register"}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--ufar-blue)', fontWeight: '600' }}>Log in</Link>
        </div>
      </div>
    </div>
  );
}