import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, orderBy, Timestamp, getDocs } from 'firebase/firestore';
import { Memory } from '../types';

export const subscribeToMemories = (userId: string, date: string, callback: (memories: Memory[]) => void) => {
  const memoriesRef = collection(db, 'memories');
  
  // Create two queries: one for owned memories, one for tagged memories
  const qOwned = query(
    memoriesRef, 
    where('userId', '==', userId), 
    where('date', '==', date)
  );

  const qTagged = query(
    memoriesRef,
    where('taggedUserIds', 'array-contains', userId),
    where('date', '==', date)
  );

  // Combine results from both queries
  const unsubOwned = onSnapshot(qOwned, (snapshotOwned) => {
    const ownedMemories = snapshotOwned.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memory));
    
    // We need to fetch tagged memories too and merge
    getDocs(qTagged).then(snapshotTagged => {
      const taggedMemories = snapshotTagged.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memory));
      
      // Merge and remove duplicates (though there shouldn't be any if logic is correct)
      const allMemories = [...ownedMemories, ...taggedMemories];
      const uniqueMemories = Array.from(new Map(allMemories.map(m => [m.id, m])).values());
      
      // Sort by createdAt desc
      uniqueMemories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      callback(uniqueMemories);
    });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'memories');
  });

  // Also listen to tagged memories for real-time updates
  const unsubTagged = onSnapshot(qTagged, (snapshotTagged) => {
    const taggedMemories = snapshotTagged.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memory));
    
    getDocs(qOwned).then(snapshotOwned => {
      const ownedMemories = snapshotOwned.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memory));
      
      const allMemories = [...ownedMemories, ...taggedMemories];
      const uniqueMemories = Array.from(new Map(allMemories.map(m => [m.id, m])).values());
      
      uniqueMemories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      callback(uniqueMemories);
    });
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'memories');
  });

  return () => {
    unsubOwned();
    unsubTagged();
  };
};

export const subscribeToAllMemoryDates = (userId: string, callback: (dates: string[]) => void) => {
  const memoriesRef = collection(db, 'memories');
  
  const qOwned = query(memoriesRef, where('userId', '==', userId));
  const qTagged = query(memoriesRef, where('taggedUserIds', 'array-contains', userId));

  const handleSnapshots = (ownedDocs: any[], taggedDocs: any[]) => {
    const allDates = new Set<string>();
    ownedDocs.forEach(doc => allDates.add(doc.data().date));
    taggedDocs.forEach(doc => allDates.add(doc.data().date));
    callback(Array.from(allDates));
  };

  let ownedDocs: any[] = [];
  let taggedDocs: any[] = [];

  const unsubOwned = onSnapshot(qOwned, (snapshot) => {
    ownedDocs = snapshot.docs;
    handleSnapshots(ownedDocs, taggedDocs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'memories');
  });

  const unsubTagged = onSnapshot(qTagged, (snapshot) => {
    taggedDocs = snapshot.docs;
    handleSnapshots(ownedDocs, taggedDocs);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'memories');
  });

  return () => {
    unsubOwned();
    unsubTagged();
  };
};

export const addMemory = async (memory: Omit<Memory, 'id' | 'createdAt'>) => {
  try {
    const memoriesRef = collection(db, 'memories');
    const docRef = await addDoc(memoriesRef, {
      ...memory,
      createdAt: new Date().toISOString(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'memories');
  }
};

export const updateMemory = async (id: string, updates: Partial<Memory>) => {
  try {
    const memoryRef = doc(db, 'memories', id);
    await updateDoc(memoryRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `memories/${id}`);
  }
};

export const deleteMemory = async (id: string) => {
  try {
    const memoryRef = doc(db, 'memories', id);
    await deleteDoc(memoryRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `memories/${id}`);
  }
};

export const getMemoriesByDate = async (userId: string, date: string): Promise<Memory[]> => {
  try {
    const memoriesRef = collection(db, 'memories');
    
    const qOwned = query(
      memoriesRef,
      where('userId', '==', userId),
      where('date', '==', date)
    );

    const qTagged = query(
      memoriesRef,
      where('taggedUserIds', 'array-contains', userId),
      where('date', '==', date)
    );

    const [ownedSnap, taggedSnap] = await Promise.all([
      getDocs(qOwned),
      getDocs(qTagged)
    ]);

    const allMemories = [
      ...ownedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memory)),
      ...taggedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memory))
    ];

    const uniqueMemories = Array.from(new Map(allMemories.map(m => [m.id, m])).values());
    uniqueMemories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return uniqueMemories;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'memories');
    return [];
  }
};
