import { ProfileForm } from "@/modules/profile/components/profile-form";
import { ProtectedRoute } from "@/components/protected-route";

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <div>
        <ProfileForm />
      </div>
    </ProtectedRoute>
  );
}
