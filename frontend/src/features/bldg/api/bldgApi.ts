export const convert3dsToGlb = async (files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  const res = await fetch('/api/convert', { // Vite Proxy를 타므로 전체 경로 불필요
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    throw new Error('변환 서버 오류');
  }

  return res.json(); // { url: string, filename: string } 반환 예상
};