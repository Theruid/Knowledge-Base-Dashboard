import React, { useState } from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { authApi } from '../../services/authApi';
import Layout from '../layout/Layout';

const Settings: React.FC = () => {
  const [loading, setLoading] = useState({
    password: false
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);





  return (
    <Layout title="Settings">

      {/* Password Management */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <form onSubmit={async (e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();

              // Reset messages
              setPasswordError(null);
              setPasswordSuccess(null);

              // Validate passwords
              if (!currentPassword || !newPassword || !confirmPassword) {
                setPasswordError('All password fields are required');
                return;
              }

              if (newPassword !== confirmPassword) {
                setPasswordError('New passwords do not match');
                return;
              }

              try {
                setLoading({ ...loading, password: true });

                const response = await authApi.changePassword({
                  currentPassword,
                  newPassword
                });

                setPasswordSuccess(response.message || 'Password changed successfully');

                // Clear form
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to change password';
                setPasswordError(errorMessage);
              } finally {
                setLoading({ ...loading, password: false });
              }
            }}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="currentPassword">
                  Current Password
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {passwordError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{passwordError}</span>
                  </div>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <Button
                variant="primary"
                icon={<Lock size={16} />}
                type="submit"
                isLoading={loading.password}
              >
                Change Password
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

    </Layout>
  );
};

export default Settings;
