
export default function Help() {
    return (
        <div className="p-8 pb-20 max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold text-purple-900 border-b-4 border-gold-500 inline-block pb-2 mb-8">
                Help & User Guide
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Section 1: Getting Started */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h2 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                        <span className="bg-purple-100 p-2 rounded-full">🚀</span> Getting Started
                    </h2>
                    <ul className="space-y-3 text-gray-600 text-sm">
                        <li>
                            <strong className="text-gray-800">Dashboard:</strong> Overview of your salon's performance, including daily sales and top stylists.
                        </li>
                        <li>
                            <strong className="text-gray-800">Navigation:</strong> Use the sidebar on the left to switch between different sections like Sales, Clients, and Reports.
                        </li>
                    </ul>
                </div>

                {/* Section 2: Recording Sales */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h2 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                        <span className="bg-purple-100 p-2 rounded-full">💰</span> Processing Sales
                    </h2>
                    <ol className="list-decimal list-inside space-y-3 text-gray-600 text-sm">
                        <li>Go to the <strong>Sales</strong> page.</li>
                        <li>Select an existing <strong>Client</strong> or "Walk-in".</li>
                        <li>Add <strong>Services</strong> provided or <strong>Products</strong> sold.</li>
                        <li>Assign a <strong>Stylist</strong> to the service for commission tracking.</li>
                        <li>Choose Payment Method (Cash/Mpesa) and click <strong>"Complete Sale"</strong>.</li>
                        <li>You can print a <strong>Receipt</strong> immediately after the sale.</li>
                    </ol>
                </div>

                {/* Section 3: Reports & Exports */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h2 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                        <span className="bg-purple-100 p-2 rounded-full">📊</span> Reports & Exports
                    </h2>
                    <ul className="space-y-3 text-gray-600 text-sm">
                        <li>
                            <strong className="text-gray-800">Financial Reports:</strong> View daily, weekly, or monthly summaries in the <strong>Reports</strong> tab.
                        </li>
                        <li>
                            <strong className="text-gray-800">PDF Export:</strong> Click the red "PDF" button to download a formal financial report.
                        </li>
                        <li>
                            <strong className="text-gray-800">Commission Payouts:</strong> Use the "Export Payout Sheet" button to generate a daily stylist payment list for signing.
                        </li>
                    </ul>
                </div>

                {/* Section 4: Admin Features */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <h2 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                        <span className="bg-purple-100 p-2 rounded-full">⚙️</span> Administration
                    </h2>
                    <ul className="space-y-3 text-gray-600 text-sm">
                        <li>
                            <strong className="text-gray-800">Manage Stock:</strong> Add or update retail items in the <strong>Products</strong> page.
                        </li>
                        <li>
                            <strong className="text-gray-800">Service Menu:</strong> Update prices and service names in the <strong>Services</strong> page.
                        </li>
                        <li>
                            <strong className="text-gray-800">Staff Management:</strong> Add new stylists and set their commission rates in the <strong>Stylists</strong> page.
                        </li>
                    </ul>
                </div>
            </div>

            <div className="mt-10 p-6 bg-purple-50 rounded-xl border border-purple-100 text-center">
                <p className="text-purple-800 font-medium">Need technical support?</p>
                <p className="text-sm text-purple-600">Contact the system administrator.</p>
            </div>
        </div>
    );
}
