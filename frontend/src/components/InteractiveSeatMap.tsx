import React, { useMemo, useRef, useEffect } from 'react';
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

interface TicketCategory {
  name: string;
  price: number;
  capacity: number;
  remaining: number;
}

interface InteractiveSeatMapProps {
  categories: TicketCategory[];
  selectedCategoryName: string | null;
  onCategoryClick: (categoryName: string | null) => void;
  eventType: string; // 'Spor' veya 'Konser' Vb
}

const CATEGORY_COLORS: Record<string, string> = {
  'VIP': '#fbbf24', 
  '1. Kategori': '#3b82f6', 
  '2. Kategori': '#10b981', 
  'Kale Arkası': '#ef4444', 
  'Sahne Önü': '#a855f7',
  'Ön Saha': '#a855f7',
  'Genel Giriş': '#f97316',
};

const DEFAULT_COLOR = '#8b5cf6'; 

const InteractiveSeatMap: React.FC<InteractiveSeatMapProps> = ({ 
  categories, 
  selectedCategoryName, 
  onCategoryClick, 
  eventType 
}) => {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  
  const isSport = eventType === 'Spor';
  
  // Categorileri harita alanlarına sıralı bir şekilde dağıtalım
  const BLOCKS = useMemo(() => {
    if (isSport) {
        return [
          { id: 'BLK-TOP', category: categories[1]?.name || categories[0]?.name }, // Örnek: 1. Kategori
          { id: 'BLK-BOT', category: categories[2]?.name || categories[0]?.name }, // Örnek: 2. Kategori
          { id: 'BLK-LEFT', category: categories[3]?.name || categories[0]?.name }, // Örnek: Kale Arkası
          { id: 'BLK-RIGHT', category: categories[0]?.name }, // Örnek: VIP
        ];
    } else {
        return [
          { id: 'BLK-ON', category: categories[0]?.name }, // Sahne Önü
          { id: 'BLK-ARKA', category: categories[1]?.name || categories[0]?.name }, // Genel Giriş
        ];
    }
  }, [isSport, categories]);

  useEffect(() => {
     if (selectedCategoryName && transformRef.current) {
        const targetBlockId = BLOCKS.find(b => b.category === selectedCategoryName)?.id;
        if (targetBlockId) {
           transformRef.current.zoomToElement(targetBlockId, 1.2, 500);
        }
     } else if (!selectedCategoryName && transformRef.current) {
        transformRef.current.resetTransform(500);
     }
  }, [selectedCategoryName, BLOCKS]);

  const renderArea = (blockId: string, customWidth: string, customHeight: string, shapeStyle: string = "rounded-3xl") => {
    const blockData = BLOCKS.find(b => b.id === blockId);
    if (!blockData) return null;

    const catName = blockData.category;
    if (!catName) return null;

    const catInfo = categories.find(c => c.name === catName);
    const isMuted = selectedCategoryName && selectedCategoryName !== catName;
    const baseColor = CATEGORY_COLORS[catName] || DEFAULT_COLOR;
    const isSoldOut = catInfo?.remaining === 0;

    return (
       <div id={blockId} 
         onClick={(e) => { 
             e.stopPropagation(); 
             if(!isSoldOut) {
                 if (selectedCategoryName === catName) {
                     onCategoryClick(null);
                 } else {
                     onCategoryClick(catName);
                 }
             }
         }}
         className={`flex flex-col items-center justify-center border-4 border-dashed transition-all duration-300 relative group 
            ${shapeStyle}
            ${isMuted ? 'opacity-30 grayscale' : 'opacity-100 shadow-2xl hover:scale-[1.02]'} 
            ${isSoldOut ? 'cursor-not-allowed opacity-20 bg-red-900/10 border-red-500/20' : 'cursor-pointer hover:border-solid'}
         `}
         style={{ 
            width: customWidth, 
            height: customHeight,
            borderColor: `${baseColor}60`, 
            backgroundColor: `${baseColor}10`,
            boxShadow: (!isMuted && !isSoldOut) ? `0 0 40px ${baseColor}15` : 'none'
         }}>

         {/* Seat-row texture (tribün koltuk dokusu) */}
         <div className="absolute inset-0 pointer-events-none mix-blend-screen"
              style={{
                 borderRadius: 'inherit',
                 opacity: isSoldOut ? 0.05 : 0.22,
                 backgroundImage: `repeating-linear-gradient(0deg, ${baseColor} 0px, ${baseColor} 1.5px, transparent 1.5px, transparent 8px), repeating-linear-gradient(90deg, ${baseColor}55 0px, ${baseColor}55 1px, transparent 1px, transparent 14px)`,
              }} />
         {/* Inner sheen */}
         <div className="absolute inset-0 pointer-events-none"
              style={{ borderRadius: 'inherit', background: `radial-gradient(120% 80% at 50% 0%, ${baseColor}22, transparent 60%)` }} />

         <div className="text-center pointer-events-none p-4 w-full h-full flex flex-col items-center justify-center relative z-10">
             <div className="font-black text-2xl mb-1 tracking-tight" style={{ color: baseColor }}>{catName}</div>
             {catInfo && (
                 <div className={`font-bold mt-2 uppercase tracking-widest text-[11px] px-3 py-1 rounded-full border ${isSoldOut ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-black/40 text-white/90 border-white/10'}`}>
                    {isSoldOut ? 'Tükendi' : `${catInfo.remaining} Kalan`}
                 </div>
             )}
             <div className="font-black text-xl mt-3 text-white/90">₺{catInfo?.price}</div>
         </div>

         {/* Overlay for selection cue */}
         {(!selectedCategoryName || isMuted) && !isSoldOut && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm" style={{ borderRadius: 'inherit' }}>
                <span className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold shadow-2xl border border-white/20 whitespace-nowrap">
                  {selectedCategoryName === catName ? 'Seçimi Kaldır' : 'Alanı Seç'}
                </span>
            </div>
         )}
         
         {/* Checkmark for Selected State */}
         {selectedCategoryName === catName && (
             <div className="absolute -top-4 -right-4 w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center shadow-lg border-4 border-slate-900 z-30 transform scale-110 animate-bounce">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
             </div>
         )}
       </div>
    );
  };

  return (
    <div className="w-full h-full bg-slate-950 rounded-3xl overflow-hidden border border-white/10 relative flex flex-col shadow-inner">
      {/* Header Tags */}
      <div className="absolute top-0 inset-x-0 z-20 flex flex-wrap items-center justify-between p-4 bg-slate-900/80 backdrop-blur-md border-b border-white/5">
        <div className="flex gap-2 items-center overflow-x-auto no-scrollbar w-full sm:w-auto pb-2 sm:pb-0">
          {categories.map((cat, idx) => (
            <button key={idx} onClick={() => {
                if (cat.remaining > 0) {
                    if (selectedCategoryName === cat.name) {
                        onCategoryClick(null);
                    } else {
                        onCategoryClick(cat.name);
                    }
                }
            }} disabled={cat.remaining===0}
               className={`flex items-center gap-2 whitespace-nowrap px-3 py-1.5 rounded-full transition-colors border ${selectedCategoryName === cat.name ? 'border-white/50 bg-white/10' : 'border-transparent hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed'}`}>
              <span className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || DEFAULT_COLOR }}></span>
              <span className="text-xs font-semibold text-fg">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Zoom Area */}
      <div className="flex-1 w-full bg-[#0a0f1c] pattern-grid-lg text-white/5 overflow-hidden flex items-center justify-center">
        <TransformWrapper
          ref={transformRef}
          initialScale={0.55}
          minScale={0.4}
          maxScale={2}
          centerOnInit={true}
          limitToBounds={false}
          panning={{ disabled: true }}
          wheel={{ disabled: true }}
          pinch={{ disabled: true }}
          doubleClick={{ disabled: true }}
        >
          <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
            
            <div className="flex flex-col items-center justify-center p-24 gap-6 min-w-[800px] min-h-[600px] pt-32">
               
               {isSport ? (
                 <>
                   {/* BLK-TOP */}
                   {renderArea('BLK-TOP', '600px', '140px', 'rounded-t-[80px] rounded-b-xl')}

                   <div className="flex w-full justify-center gap-6 items-center">
                     {/* BLK-LEFT */}
                     {renderArea('BLK-LEFT', '180px', '300px', 'rounded-l-[80px] rounded-r-xl')}

                     {/* FIELD (PITCH) — futbol sahası */}
                     <div className="w-[420px] h-[270px] rounded-2xl relative overflow-hidden flex-shrink-0 border-2 border-white/40 shadow-[inset_0_0_70px_rgba(0,0,0,0.45),0_20px_60px_rgba(0,0,0,0.5)]"
                          style={{ background: 'linear-gradient(160deg, #1a8a45 0%, #15803d 50%, #126a33 100%)' }}>
                        {/* Çim biçim deseni */}
                        <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.055) 0 42px, rgba(0,0,0,0.06) 42px 84px)' }} />
                        {/* Dış çizgi */}
                        <div className="absolute inset-5 border-2 border-white/55 rounded-[2px]" />
                        {/* Orta saha çizgisi */}
                        <div className="absolute top-5 bottom-5 left-1/2 -translate-x-1/2 w-[2px] bg-white/55" />
                        {/* Orta yuvarlak + nokta */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[88px] h-[88px] rounded-full border-2 border-white/55" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/70" />
                        {/* Sol ceza sahası + kale sahası */}
                        <div className="absolute top-1/2 -translate-y-1/2 left-5 w-[58px] h-[150px] border-2 border-l-0 border-white/55" />
                        <div className="absolute top-1/2 -translate-y-1/2 left-5 w-[26px] h-[78px] border-2 border-l-0 border-white/55" />
                        <div className="absolute top-1/2 -translate-y-1/2 left-[3px] w-[10px] h-[44px] border-2 border-l-0 border-white/70 bg-white/10" />
                        {/* Sağ ceza sahası + kale sahası */}
                        <div className="absolute top-1/2 -translate-y-1/2 right-5 w-[58px] h-[150px] border-2 border-r-0 border-white/55" />
                        <div className="absolute top-1/2 -translate-y-1/2 right-5 w-[26px] h-[78px] border-2 border-r-0 border-white/55" />
                        <div className="absolute top-1/2 -translate-y-1/2 right-[3px] w-[10px] h-[44px] border-2 border-r-0 border-white/70 bg-white/10" />
                        {/* Köşe yayları */}
                        <div className="absolute top-5 left-5 w-3 h-3 border-b-2 border-r-2 border-white/45 rounded-br-full" />
                        <div className="absolute top-5 right-5 w-3 h-3 border-b-2 border-l-2 border-white/45 rounded-bl-full" />
                        <div className="absolute bottom-5 left-5 w-3 h-3 border-t-2 border-r-2 border-white/45 rounded-tr-full" />
                        <div className="absolute bottom-5 right-5 w-3 h-3 border-t-2 border-l-2 border-white/45 rounded-tl-full" />
                     </div>

                     {/* BLK-RIGHT */}
                     {renderArea('BLK-RIGHT', '180px', '300px', 'rounded-r-[80px] rounded-l-xl')}
                   </div>

                   {/* BLK-BOT */}
                   {renderArea('BLK-BOT', '600px', '140px', 'rounded-b-[80px] rounded-t-xl')}
                 </>
               ) : (
                 // KONSER (STAGE LAYOUT)
                 <div className="flex flex-col gap-12 items-center w-full mt-10">
                    {/* SAHNE */}
                    <div className="w-[600px] h-[120px] bg-violet-900/30 border-2 border-white/20 rounded-t-full border-b-0 flex flex-col items-center justify-center font-black tracking-widest text-violet-300 text-4xl shadow-[0_-20px_80px_rgba(139,92,246,0.2)] relative overflow-hidden">
                       <span className="relative z-10 drop-shadow-2xl">SAHNE</span>
                       <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[400px] h-[80px] bg-violet-500/40 rounded-full blur-[40px]"></div>
                    </div>
                    
                    {/* SAHNE ONU */}
                    <div>
                      {renderArea('BLK-ON', '700px', '200px', 'rounded-3xl')}
                    </div>

                    {/* GENEL GIRIS */}
                    <div className="mt-8">
                      {renderArea('BLK-ARKA', '900px', '300px', 'rounded-3xl rounded-b-[100px]')}
                    </div>
                 </div>
               )}

            </div>

          </TransformComponent>
        </TransformWrapper>
      </div>
    </div>
  );
};

export default InteractiveSeatMap;
