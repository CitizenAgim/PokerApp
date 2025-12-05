import { auth, db } from '@/config/firebase';
import { User } from '@/types/poker';
import { updateProfile as firebaseUpdateProfile, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get user document from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
          } else {
            // Create user document if it doesn't exist
            const newUser: User = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              photoUrl: firebaseUser.photoURL || undefined,
              createdAt: Date.now(),
            };
            await setDoc(userDocRef, newUser);
            setUser(newUser);
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateProfile = async (data: Partial<User>) => {
    if (!auth.currentUser) throw new Error('No user logged in');

    try {
      // Update Firebase Auth profile
      if (data.displayName || data.photoUrl) {
        await firebaseUpdateProfile(auth.currentUser, {
          displayName: data.displayName,
          photoURL: data.photoUrl,
        });
      }

      // Update Firestore document
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userDocRef, data);

      // Update local state
      setUser(prev => prev ? { ...prev, ...data } : null);
    } catch (err) {
      console.error('Error updating profile:', err);
      throw err;
    }
  };

  return { user, loading, error, updateProfile };
}
