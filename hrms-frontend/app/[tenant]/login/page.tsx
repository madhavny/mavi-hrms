'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { tenantApi } from '@/lib/api';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function TenantLoginPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params.tenant as string;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await tenantApi.login(email, password, tenantSlug);
      if (res.success && res.data) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        localStorage.setItem('tenant', JSON.stringify(res.data.tenant));
        router.push(`/${tenantSlug}/dashboard`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 relative">
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <ThemeToggle />
            </div>
          </TooltipTrigger>
          <TooltipContent>Toggle theme</TooltipContent>
        </Tooltip>
      </div>

      <div className="w-full max-w-md p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mavi HRMS</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 capitalize">{tenantSlug.replace(/-/g, ' ')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md">{error}</div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign in to your account</TooltipContent>
          </Tooltip>
        </form>

        <div className="mt-6 text-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={`/${tenantSlug}/forgot-password`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
              >
                Forgot your password?
              </Link>
            </TooltipTrigger>
            <TooltipContent>Reset your password</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
