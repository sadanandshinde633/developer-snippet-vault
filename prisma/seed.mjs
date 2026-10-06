import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo data...');

  const passwordHash = await bcrypt.hash('developer123', 10);

  // Demo user
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@snippetvault.dev' },
    update: {},
    create: {
      email: 'demo@snippetvault.dev',
      name: 'Alex Rivera',
      passwordHash,
    },
  });

  const demoSnippets = [
    {
      title: 'Debounce Function with TypeScript Generics',
      description: 'Limits the execution rate of a function call to prevent rapid repeat invocations.',
      language: 'typescript',
      code: `export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), waitMs);
  };
}`,
      tags: JSON.stringify(['#typescript', '#utility', '#performance', '#generics']),
      summary: 'A reusable TypeScript debounce implementation to limit rapid execution of callback functions.',
      isPublic: true,
      userId: demoUser.id,
    },
    {
      title: 'React Custom Hook: useOnlineStatus',
      description: 'Subscribes to browser online/offline events for network-resilient web apps.',
      language: 'typescript',
      code: `import { useState, useEffect } from 'react';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}`,
      tags: JSON.stringify(['#react', '#hooks', '#typescript', '#browser-api']),
      summary: 'A reactive custom hook that tracks and notifies the application of browser internet connectivity status.',
      isPublic: true,
      userId: demoUser.id,
    },
    {
      title: 'Python Safe JSON File Reader with Fallback',
      description: 'Robust JSON file parsing with error handling and default payload return.',
      language: 'python',
      code: `import json
import logging
from typing import Any, Dict

def load_json_config(filepath: str, default: Dict[str, Any] = None) -> Dict[str, Any]:
    """Safely reads a JSON configuration file with error handling."""
    if default is None:
        default = {}
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logging.warning(f"Could not load JSON from {filepath}: {e}. Returning default.")
        return default`,
      tags: JSON.stringify(['#python', '#json', '#error-handling', '#io']),
      summary: 'A Python utility function providing fail-safe JSON file deserialization with automatic logging and defaults.',
      isPublic: true,
      userId: demoUser.id,
    },
  ];

  for (const snippet of demoSnippets) {
    const existing = await prisma.snippet.findFirst({
      where: { title: snippet.title, userId: demoUser.id },
    });
    if (!existing) {
      await prisma.snippet.create({ data: snippet });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
