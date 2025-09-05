import { Editor } from './components/Editor';
import { Header } from './components/Header';

const STORAGE_KEY = 'itinerary-md-content';

function App() {
    return (
        <div className="max-w-screen-2xl mx-auto h-svh overflow-hidden flex flex-col pt-8 pb-0 md:pb-8">
            <Header />
            <div className="px-0 md:px-8 w-full flex-1 min-h-0">
                <Editor storageKey={STORAGE_KEY} samplePath={'/sample.md'} />
            </div>
        </div>
    );
}

export default App;
