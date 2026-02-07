
import React, { useState } from 'react';
import Header from './components/Header';
import { RecipeState } from './types';
import { getRecipeRecommendation, generateDishImage } from './services/geminiService';

// Fix: Declare global google variable for Google Identity Services loaded via script tag in index.html.
declare var google: any;

const App: React.FC = () => {
  const [ingredients, setIngredients] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'authorizing' | 'uploading' | 'done' | 'error'>('idle');
  const [state, setState] = useState<RecipeState>({
    loading: false,
    content: '',
    image: null,
    error: null,
  });

  const TARGET_FOLDER_ID = "129mkG3u7CprXhWE3EnSe_WnDY4s0B7lS";
  const STORAGE_FOLDER_URL = `https://drive.google.com/drive/folders/${TARGET_FOLDER_ID}?usp=sharing`;

  // 사용자가 요청한 이미지 URL로 교체 (https://ibb.co/yBgjb2QH 의 직접 이미지 링크 버전)
  const topBannerUrl = "https://i.ibb.co/4g4r5kVh/Kakao-Talk-20251229-194547124-01.jpg"; 
  const footerLogoUrl = "https://i.ibb.co/4g4r5kVh/Kakao-Talk-20251229-194547124-01.jpg";

  const handleRecommend = async () => {
    if (!ingredients.trim()) {
      alert('재료를 입력해주세요!');
      return;
    }
    setState({ ...state, loading: true, error: null, content: '', image: null });
    setUploadStatus('idle');

    try {
      const recipeText = await getRecipeRecommendation(ingredients);
      setState(prev => ({ ...prev, content: recipeText }));
      
      const titleMatch = recipeText.match(/# (.*)|요리명: (.*)|제목: (.*)/);
      const dishName = titleMatch ? (titleMatch[1] || titleMatch[2] || titleMatch[3]) : 'delicious food';
      
      const imageUrl = await generateDishImage(dishName.trim());
      setState(prev => ({ ...prev, loading: false, image: imageUrl }));
    } catch (err) {
      setState(prev => ({ ...prev, loading: false, error: '레시피를 생성하는 중에 문제가 발생했습니다.' }));
    }
  };

  const base64ToBlob = (base64: string, contentType: string) => {
    const split = base64.split(',');
    const byteCharacters = atob(split[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  };

  const uploadToDrive = async (accessToken: string) => {
    if (!state.image) return;
    setUploadStatus('uploading');

    try {
      const blob = base64ToBlob(state.image, 'image/png');
      const metadata = {
        name: `Recipe_${Date.now()}.png`,
        mimeType: 'image/png',
        parents: [TARGET_FOLDER_ID]
      };

      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', blob);

      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (response.ok) {
        setUploadStatus('done');
        setTimeout(() => setUploadStatus('idle'), 5000);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error(error);
      setUploadStatus('error');
      alert('구글 드라이브 업로드 중 오류가 발생했습니다.');
    }
  };

  const handleSaveToDrive = () => {
    if (typeof google === 'undefined' || !google.accounts) {
      alert('구글 서비스 로딩 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setUploadStatus('authorizing');
    
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: '864239857214-placeholder.apps.googleusercontent.com',
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.access_token) {
            uploadToDrive(response.access_token);
          } else {
            setUploadStatus('error');
          }
        },
      });
      client.requestAccessToken();
    } catch (e) {
      setUploadStatus('error');
      console.error("Auth client init failed:", e);
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 max-w-3xl mx-auto">
      <Header />

      <main className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="w-full h-64 overflow-hidden relative">
          <img src={topBannerUrl} alt="Banner" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          <div className="absolute bottom-4 left-6">
            <h2 className="text-white text-2xl font-bold">AI 맞춤형 레시피 서비스</h2>
          </div>
        </div>

        <div className="p-8">
          <section className="mb-10">
            <label className="block text-xl font-bold text-gray-800 mb-4">재료를 입력하세요 🧺</label>
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="text"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="예: 연어, 아보카도, 레몬..."
                className="flex-1 p-5 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-orange-400 focus:ring-0 transition-all text-lg shadow-sm"
              />
              <button
                onClick={handleRecommend}
                disabled={state.loading}
                className="px-8 py-5 rounded-2xl font-black text-lg text-white bg-gradient-to-r from-orange-500 to-red-500 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-orange-100"
              >
                {state.loading ? '분석 중...' : '레시피 찾기 🔥'}
              </button>
            </div>
          </section>

          <section className="space-y-10">
            {state.content && (
              <div className="p-8 bg-orange-50/50 rounded-3xl border border-orange-100 animate-fadeIn">
                <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                  <span className="bg-orange-500 text-white p-2 rounded-xl text-xl">📝</span> 레시피
                </h2>
                <div className="prose prose-orange max-w-none text-gray-800 leading-relaxed">
                  {state.content.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </div>
            )}

            <div className="mt-12">
               <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                  <span className="bg-indigo-500 text-white p-2 rounded-xl text-xl">🎨</span> 완성 예상도
                </h2>
              <div className="group relative w-full aspect-video rounded-3xl overflow-hidden bg-gray-50 border-4 border-dashed border-gray-200 flex items-center justify-center transition-all duration-300">
                {state.image ? (
                  <>
                    <img src={state.image} alt="Dish" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                      <button 
                        onClick={handleSaveToDrive}
                        disabled={uploadStatus === 'authorizing' || uploadStatus === 'uploading'}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-lg shadow-2xl flex items-center gap-3 transform hover:scale-105 transition-all disabled:opacity-50"
                      >
                        {uploadStatus === 'uploading' ? '업로드 중...' : uploadStatus === 'authorizing' ? '인증 중...' : '구글 드라이브에 직접 저장'}
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 2L17 11.5H8L12.5 2zM15.5 13.5H21.5L17.5 21.5H11.5L15.5 13.5zM2.5 21.5L6.5 13.5H12.5L8.5 21.5H2.5z"/></svg>
                      </button>
                      <a href={STORAGE_FOLDER_URL} target="_blank" rel="noopener noreferrer" className="text-white underline text-sm opacity-80 hover:opacity-100">저장 폴더 확인하기</a>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <div className={`w-12 h-12 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin mx-auto mb-4 ${state.loading ? 'block' : 'hidden'}`}></div>
                    <p className="text-gray-400 font-medium">{state.loading ? '이미지를 생성 중입니다...' : '이미지 생성 대기 중...'}</p>
                  </div>
                )}

                {uploadStatus === 'done' && (
                  <div className="absolute inset-0 bg-green-600/95 flex flex-col items-center justify-center text-white p-6 animate-fadeIn z-10">
                    <span className="text-6xl mb-4">✅</span>
                    <h3 className="text-2xl font-black mb-2">저장 완료!</h3>
                    <p className="text-center opacity-90 mb-6">지정하신 구글 드라이브 폴더에<br/>이미지가 성공적으로 전송되었습니다.</p>
                    <button onClick={() => setUploadStatus('idle')} className="bg-white text-green-700 px-8 py-2 rounded-full font-bold shadow-lg">확인</button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {state.error && (
            <div className="mt-8 p-5 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-center font-bold">
              ⚠️ {state.error}
            </div>
          )}
        </div>
      </main>

      <footer className="mt-16 text-center py-8">
        <img src={footerLogoUrl} alt="Logo" className="w-16 h-16 rounded-full mx-auto mb-4 border-2 border-orange-200 shadow-sm" />
        <p className="text-gray-400 text-sm">© 2024 AI Recipe Assistant. All rights reserved.</p>
      </footer>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default App;
