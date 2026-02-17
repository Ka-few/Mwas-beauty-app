import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { bookingService } from '../services/bookings.service';
import { getServices } from '../services/services.api';
import { getStylists } from '../services/stylists.api';
import { Booking, BookingAnalytics, BookingSource, BookingStatus, BookingType } from '../types/booking';
import DataTable from '../components/tables/DataTable';
import { getClients } from '../services/clients.api';

const locales = {
    'en-US': enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

export default function Bookings() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'analytics'>('calendar');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [stylists, setStylists] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<BookingAnalytics | null>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingBooking, setEditingBooking] = useState<Partial<Booking> | null>(null);
    const [clientSearch, setClientSearch] = useState('');
    const [showClientResults, setShowClientResults] = useState(false);

    // Form state
    const [formData, setFormData] = useState<Partial<Booking>>({
        client_id: null,
        customer_name: '',
        phone_number: '',
        services: [],
        stylist_id: null,
        booking_date: format(new Date(), 'yyyy-MM-dd'),
        booking_time: '09:00',
        source: 'whatsapp',
        booking_type: 'scheduled',
        status: 'scheduled',
        notes: ''
    });

    const fetchData = async () => {
        try {
            const [bookingsData, servicesData, stylistsData, analyticsData, clientsData] = await Promise.all([
                bookingService.getBookings(),
                getServices(),
                getStylists(),
                bookingService.getBookingAnalytics(),
                getClients()
            ]);
            setBookings(bookingsData);
            setServices(servicesData);
            setStylists(stylistsData);
            setAnalytics(analyticsData);
            setClients(clientsData);
        } catch (error) {
            console.error('Error fetching bookings data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (booking: Partial<Booking> | null = null) => {
        if (booking) {
            setFormData({
                ...booking,
                services: booking.services || []
            });
            setEditingBooking(booking);
            setClientSearch(booking.customer_name || '');
        } else {
            setFormData({
                client_id: null,
                customer_name: '',
                phone_number: '',
                services: [],
                stylist_id: null,
                booking_date: format(new Date(), 'yyyy-MM-dd'),
                booking_time: format(new Date(), 'HH:mm'),
                source: 'whatsapp',
                booking_type: 'scheduled',
                status: 'scheduled',
                notes: ''
            });
            setEditingBooking(null);
            setClientSearch('');
        }
        setShowModal(true);
        setShowClientResults(false);
    };

    const handleSelectClient = (client: any) => {
        setFormData({
            ...formData,
            client_id: client.id,
            customer_name: client.name,
            phone_number: client.phone
        });
        setClientSearch(client.name);
        setShowClientResults(false);
    };

    const filteredClients = useMemo(() => {
        if (!clientSearch) return [];
        return clients.filter(c =>
            c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
            c.phone.includes(clientSearch)
        ).slice(0, 5);
    }, [clients, clientSearch]);

    const handleAddService = (serviceId: string) => {
        if (!serviceId) return;
        const sId = Number(serviceId);
        const service = services.find(s => s.id === sId);
        if (service) {
            const currentServices = [...(formData.services || [])];
            // Check if already added
            if (currentServices.find(s => s.service_id === sId)) return;

            currentServices.push({
                service_id: sId,
                stylist_id: formData.stylist_id || stylists[0]?.id || null
            });
            setFormData({ ...formData, services: currentServices });
        }
    };

    const handleRemoveService = (serviceId: number) => {
        setFormData({
            ...formData,
            services: (formData.services || []).filter(s => s.service_id !== serviceId)
        });
    };

    const handleUpdateServiceStylist = (serviceId: number, stylistId: number | null) => {
        setFormData({
            ...formData,
            services: (formData.services || []).map(s =>
                s.service_id === serviceId ? { ...s, stylist_id: stylistId } : s
            )
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingBooking?.id) {
                await bookingService.updateBooking(editingBooking.id, formData);
            } else {
                await bookingService.createBooking(formData);
            }
            setShowModal(false);
            fetchData();
        } catch (error: any) {
            console.error('Error saving booking:', error);
            const errMsg = error.response?.data?.error || error.message || 'Failed to save booking';
            alert(errMsg);
        }
    };

    const handleStatusChange = async (id: number, status: BookingStatus) => {
        try {
            await bookingService.updateBooking(id, { status });

            if (status === 'completed') {
                const booking = bookings.find(b => b.id === id);
                if (booking) {
                    navigate('/sales', { state: { bookingData: booking } });
                    return;
                }
            }

            fetchData();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this booking?')) {
            try {
                await bookingService.deleteBooking(id);
                fetchData();
            } catch (error) {
                console.error('Error deleting booking:', error);
            }
        }
    };

    // Format events for calendar
    const events = useMemo(() => {
        return bookings.map(b => {
            const start = new Date(`${b.booking_date}T${b.booking_time}`);
            const end = new Date(`${b.booking_date}T${b.end_time || b.booking_time}`);

            // If end time is before start time (shouldn't happen with correct logic), add 30 mins
            if (end <= start) {
                end.setMinutes(start.getMinutes() + 30);
            }

            return {
                id: b.id,
                title: `${b.customer_name} - ${b.service_names} (${b.stylist_name || 'No Stylist'})`,
                start,
                end,
                resource: b,
            };
        });
    }, [bookings]);

    // Event styling
    const eventPropGetter = (event: any) => {
        const booking = event.resource as Booking;
        let backgroundColor = '#3182ce'; // Default Blue

        if (booking.booking_type === 'walk-in' && booking.status !== 'completed') {
            backgroundColor = '#e53e3e'; // Red for Walk-in Urgent
        } else if (booking.status === 'completed') {
            backgroundColor = '#38a169'; // Green for Completed/Available
        } else if (booking.status === 'in-progress') {
            backgroundColor = '#d69e2e'; // Orange for In-Progress
        } else if (booking.status === 'cancelled' || booking.status === 'no-show') {
            backgroundColor = '#718096'; // Gray
        }

        return { style: { backgroundColor } };
    };

    return (
        <div className="p-4 space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-purple-100">
                <h1 className="text-2xl font-bold text-purple-900">Bookings Management</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="btn-gold flex items-center gap-2"
                >
                    <span>+</span> New Booking
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-purple-200">
                <button
                    onClick={() => setActiveTab('calendar')}
                    className={`px-6 py-2 font-semibold transition-colors ${activeTab === 'calendar' ? 'text-purple-700 border-b-2 border-purple-700 bg-purple-50' : 'text-gray-500 hover:text-purple-600'}`}
                >
                    Calendar View
                </button>
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-6 py-2 font-semibold transition-colors ${activeTab === 'list' ? 'text-purple-700 border-b-2 border-purple-700 bg-purple-50' : 'text-gray-500 hover:text-purple-600'}`}
                >
                    List View
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-6 py-2 font-semibold transition-colors ${activeTab === 'analytics' ? 'text-purple-700 border-b-2 border-purple-700 bg-purple-50' : 'text-gray-500 hover:text-purple-600'}`}
                >
                    Analytics
                </button>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden min-h-[600px] max-h-[calc(100vh-200px)] flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar p-1">
                    {activeTab === 'calendar' && (
                        <div className="h-[700px] p-4 anim-fade-in">
                            <Calendar
                                localizer={localizer}
                                events={events}
                                startAccessor="start"
                                endAccessor="end"
                                style={{ height: '100%' }}
                                eventPropGetter={eventPropGetter}
                                onSelectEvent={(event) => handleOpenModal(event.resource)}
                                tooltipAccessor={(event) => event.title}
                                views={[Views.MONTH, Views.WEEK, Views.DAY]}
                                defaultView={Views.WEEK}
                            />
                            <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium border-t pt-4 border-gray-100">
                                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Scheduled</div>
                                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full"></span> Walk-in Urgent</div>
                                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Completed</div>
                                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-600 rounded-full"></span> In-Progress</div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'list' && (
                        <div className="p-4 anim-fade-in">
                            <DataTable
                                columns={['id', 'customer_name', 'phone_number', 'service_names', 'status', 'booking_date', 'booking_time']}
                                data={bookings}
                                actions={(row) => (
                                    <div className="flex gap-2">
                                        {row.status !== 'completed' && row.status !== 'cancelled' && (
                                            <button
                                                onClick={() => handleStatusChange(row.id, 'completed')}
                                                className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold hover:bg-green-200 transition-colors"
                                            >
                                                Done
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleOpenModal(row)}
                                            className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold hover:bg-purple-200 transition-colors"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(row.id)}
                                            className="bg-red-50 text-red-500 px-2 py-1 rounded text-xs font-bold hover:bg-red-100 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                )}
                            />
                        </div>
                    )}

                    {activeTab === 'analytics' && <BookingAnalyticsView data={analytics} />}
                </div>
            </div>

            {/* Booking Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden anim-fade-in">
                        <div className="bg-purple-900 p-4 text-white flex justify-between items-center">
                            <h2 className="text-xl font-bold">{editingBooking ? 'Edit Booking' : 'New Booking'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-2xl hover:text-gold-400">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-1 relative">
                                <label className="text-xs font-bold uppercase text-gray-500">Search Client</label>
                                <input
                                    type="text"
                                    placeholder="Search by name or phone..."
                                    value={clientSearch}
                                    onChange={e => {
                                        setClientSearch(e.target.value);
                                        setShowClientResults(true);
                                        setFormData({ ...formData, customer_name: e.target.value });
                                    }}
                                    className="w-full border-2 border-gray-100 p-2 rounded-lg focus:border-purple-500 outline-none"
                                />
                                {showClientResults && filteredClients.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border border-gray-200 mt-1 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                                        {filteredClients.map(c => (
                                            <div
                                                key={c.id}
                                                onClick={() => handleSelectClient(c)}
                                                className="p-3 hover:bg-purple-50 cursor-pointer border-b last:border-0 border-gray-100"
                                            >
                                                <p className="font-bold text-gray-800">{c.name}</p>
                                                <p className="text-xs text-gray-500">{c.phone}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-500">Phone Number</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.phone_number}
                                    onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                    className="w-full border-2 border-gray-100 p-2 rounded-lg focus:border-purple-500 outline-none bg-gray-50"
                                />
                            </div>

                            {/* Service Selection Area */}
                            <div className="md:col-span-2 bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-purple-700 mb-2">Add Services</label>
                                    <select
                                        className="w-full border-2 border-white p-2 rounded-lg focus:border-purple-500 outline-none bg-white shadow-sm"
                                        onChange={(e) => handleAddService(e.target.value)}
                                        value=""
                                    >
                                        <option value="">+ Choose a service...</option>
                                        {services.filter(s => !formData.services?.find(fs => fs.service_id === s.id)).map(s => (
                                            <option key={s.id} value={s.id}>{s.name} - KES {s.price}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    {formData.services?.map(item => {
                                        const service = services.find(s => s.id === item.service_id);
                                        return (
                                            <div key={item.service_id} className="bg-white p-3 rounded-lg shadow-sm border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="flex-1">
                                                    <p className="font-bold text-gray-800 text-sm">{service?.name}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">KES {service?.price} | {service?.duration_minutes}m</p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Stylist:</span>
                                                    <select
                                                        value={item.stylist_id || ''}
                                                        onChange={(e) => handleUpdateServiceStylist(item.service_id, e.target.value ? Number(e.target.value) : null)}
                                                        className="flex-1 border border-gray-100 p-1 rounded text-xs bg-gray-50 focus:border-purple-300 outline-none"
                                                    >
                                                        <option value="">Any Stylist</option>
                                                        {stylists.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                                    </select>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveService(item.service_id)}
                                                    className="text-red-400 hover:text-red-600 text-sm font-bold bg-red-50 hover:bg-red-100 w-8 h-8 rounded-full transition-colors flex items-center justify-center"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {(!formData.services || formData.services.length === 0) && (
                                        <div className="text-center py-4 border-2 border-dashed border-purple-200 rounded-lg text-purple-300 text-xs italic">
                                            No services added yet
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-500">Overall Preferred Stylist</label>
                                <select
                                    value={formData.stylist_id || ''}
                                    onChange={e => setFormData({ ...formData, stylist_id: e.target.value ? Number(e.target.value) : null })}
                                    className="w-full border-2 border-gray-100 p-2 rounded-lg focus:border-purple-500 outline-none font-medium text-purple-700"
                                >
                                    <option value="">Any/None</option>
                                    {stylists.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-500">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.booking_date}
                                    onChange={e => setFormData({ ...formData, booking_date: e.target.value })}
                                    className="w-full border-2 border-gray-100 p-2 rounded-lg focus:border-purple-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-500">Time</label>
                                <input
                                    type="time"
                                    required
                                    value={formData.booking_time}
                                    onChange={e => setFormData({ ...formData, booking_time: e.target.value })}
                                    className="w-full border-2 border-gray-100 p-2 rounded-lg focus:border-purple-500 outline-none"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-500">Source</label>
                                <select
                                    value={formData.source}
                                    onChange={e => setFormData({ ...formData, source: e.target.value as BookingSource })}
                                    className="w-full border-2 border-gray-100 p-2 rounded-lg focus:border-purple-500 outline-none"
                                >
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="facebook">Facebook</option>
                                    <option value="instagram">Instagram</option>
                                    <option value="call">Phone Call</option>
                                    <option value="physical">Physical Booking</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-500">Booking Type</label>
                                <select
                                    value={formData.booking_type}
                                    onChange={e => setFormData({ ...formData, booking_type: e.target.value as BookingType })}
                                    className="w-full border-2 border-gray-100 p-2 rounded-lg focus:border-purple-500 outline-none"
                                >
                                    <option value="scheduled">Scheduled</option>
                                    <option value="walk-in">Walk-in / Urgent</option>
                                </select>
                            </div>

                            <div className="space-y-1 flex flex-col justify-end">
                                <label className="text-xs font-bold uppercase text-gray-500">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as BookingStatus })}
                                    className="w-full border-2 border-gray-100 p-2 rounded-lg focus:border-purple-500 outline-none bg-purple-50 border-purple-200"
                                >
                                    <option value="scheduled">Scheduled</option>
                                    <option value="in-progress">In-Progress</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="no-show">No-Show</option>
                                </select>
                            </div>

                            <div className="md:col-span-2 space-y-1">
                                <label className="text-xs font-bold uppercase text-gray-500">Notes (Optional)</label>
                                <textarea
                                    value={formData.notes || ''}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full border-2 border-gray-100 p-2 rounded-lg focus:border-purple-500 outline-none h-20"
                                />
                            </div>

                            <div className="md:col-span-2 flex gap-4 pt-4">
                                <button type="submit" className="flex-1 btn-purple py-3 font-bold uppercase tracking-wider">
                                    {editingBooking ? 'Update Booking' : 'Create Booking'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="bg-gray-100 text-gray-600 px-6 py-3 rounded-lg font-bold hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const BookingAnalyticsView: React.FC<{ data: BookingAnalytics | null }> = ({ data }) => {
    if (!data) return <div className="p-8 text-center text-gray-400">Loading analytics...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 anim-fade-in">
            {/* Source Stats */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 border-l-4 border-l-purple-500">
                <h3 className="text-lg font-bold mb-4 text-purple-900">Bookings by Source</h3>
                <div className="space-y-2">
                    {data.sourceStats.map(s => (
                        <div key={s.source} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="capitalize font-medium text-gray-700">{s.source}</span>
                            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-bold">{s.count}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Staff Utilization */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 border-l-4 border-l-yellow-500">
                <h3 className="text-lg font-bold mb-4 text-purple-900">Staff Utilization</h3>
                <div className="space-y-2">
                    {data.staffStats.map(s => (
                        <div key={s.name || 'Unassigned'} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="font-medium text-gray-700">{s.name || 'Unassigned'}</span>
                            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">{s.appointment_count} appts</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Revenue by Service */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 border-l-4 border-l-green-500">
                <h3 className="text-lg font-bold mb-4 text-purple-900">Revenue by Service</h3>
                <div className="space-y-2">
                    {data.revenueByService.map(s => (
                        <div key={s.service_name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="font-medium text-gray-700">{s.service_name}</span>
                            <span className="text-green-700 font-bold">KES {s.revenue.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Revenue by Type */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 border-l-4 border-l-blue-500">
                <h3 className="text-lg font-bold mb-4 text-purple-900">Revenue by Booking Type</h3>
                <div className="space-y-2">
                    {data.revenueByType.map(s => (
                        <div key={s.booking_type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="capitalize font-medium text-gray-700">{s.booking_type}</span>
                            <span className="text-blue-700 font-bold">KES {s.revenue.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
