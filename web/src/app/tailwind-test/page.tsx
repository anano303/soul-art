export default function TailwindTest() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Tailwind CSS Test Page</h1>
      
      {/* Basic Tailwind Classes */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Basic Classes Test</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-500 text-white p-4 rounded-lg">
            <p className="font-medium">Blue Background</p>
            <p className="text-sm opacity-90">Standard Tailwind Blue</p>
          </div>
          <div className="bg-green-500 text-white p-4 rounded-lg">
            <p className="font-medium">Green Background</p>
            <p className="text-sm opacity-90">Standard Tailwind Green</p>
          </div>
          <div className="bg-red-500 text-white p-4 rounded-lg">
            <p className="font-medium">Red Background</p>
            <p className="text-sm opacity-90">Standard Tailwind Red</p>
          </div>
        </div>
      </section>

      {/* Custom SoulArt Colors */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Custom SoulArt Colors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-soulart-blue text-white p-6 rounded-lg">
            <p className="font-medium text-lg">SoulArt Blue</p>
            <p className="text-sm opacity-90">#012645</p>
          </div>
          <div className="bg-soulart-gold text-black p-6 rounded-lg">
            <p className="font-medium text-lg">SoulArt Gold</p>
            <p className="text-sm opacity-90">#E8A317</p>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Typography Test</h2>
        <div className="space-y-2">
          <p className="text-xs">Extra Small Text (text-xs)</p>
          <p className="text-sm">Small Text (text-sm)</p>
          <p className="text-base">Base Text (text-base)</p>
          <p className="text-lg">Large Text (text-lg)</p>
          <p className="text-xl">Extra Large Text (text-xl)</p>
          <p className="text-2xl">2XL Text (text-2xl)</p>
          <p className="text-3xl">3XL Text (text-3xl)</p>
        </div>
      </section>

      {/* Custom Fonts */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Custom Fonts Test</h2>
        <div className="space-y-4">
          <p className="font-firago text-lg">This text should use FiraGO font (font-firago)</p>
          <p className="font-satoshi text-lg">This text should use Satoshi font (font-satoshi)</p>
          <p className="font-sans text-lg">This text uses default sans-serif (font-sans)</p>
        </div>
      </section>

      {/* Layout & Spacing */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Layout & Spacing Test</h2>
        <div className="flex flex-wrap gap-4">
          <div className="w-20 h-20 bg-purple-300 rounded flex items-center justify-center">
            <span className="text-xs">Flex</span>
          </div>
          <div className="w-20 h-20 bg-pink-300 rounded flex items-center justify-center">
            <span className="text-xs">Items</span>
          </div>
          <div className="w-20 h-20 bg-indigo-300 rounded flex items-center justify-center">
            <span className="text-xs">Center</span>
          </div>
        </div>
      </section>

      {/* Hover Effects */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Interactive States</h2>
        <div className="space-y-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
            Hover me (should change from blue-600 to blue-700)
          </button>
          <button className="bg-soulart-blue hover:bg-soulart-gold hover:text-black text-white px-6 py-3 rounded-lg transition-all">
            SoulArt Colors (blue → gold)
          </button>
        </div>
      </section>

      {/* Responsive Test */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Responsive Test</h2>
        <div className="bg-gray-200 p-4 rounded-lg">
          <p className="text-sm md:text-base lg:text-lg xl:text-xl">
            This text should change size on different screen sizes:
            <br />
            <span className="font-medium">
              Small (text-sm) → Medium (text-base) → Large (text-lg) → XLarge (text-xl)
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}
