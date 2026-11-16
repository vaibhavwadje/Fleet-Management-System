using AutoMapper;
using FleetManagement.DTO.Requests;
using FleetManagement.DTO.Responses;
using FleetManagement.Models;

namespace FleetManagement.AutoMapper;

/// <summary>
/// REQUIREMENT 10 - entity to DTO mapping in one place.
///
/// WHY THE EXPLICIT ForMember CALLS
/// --------------------------------
/// Convention gets most of it, but three things need saying out loud:
///
///   - enums must go out as STRINGS ("AVAILABLE", not 0), because that is what
///     the Java API returns and what the React client compares against;
///   - navigation properties are flattened (Hub.City.CityName -> CityName),
///     and AutoMapper's flattening convention would look for "HubCityName";
///   - CarType.CarTypeName is exposed as "carType", matching the Java field.
///
/// Every one of those is a place where a silent convention mismatch would ship
/// a null to the browser instead of failing loudly.
/// </summary>
public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // ── Master data ─────────────────────────────────────────────────
        CreateMap<State, StateResponse>();
        CreateMap<City, CityResponse>();

        CreateMap<Hub, HubResponse>()
            .ForMember(d => d.HubType, o => o.MapFrom(s => s.HubType.ToString()))
            .ForMember(d => d.CityName, o => o.MapFrom(s => s.City != null ? s.City.CityName : null))
            .ForMember(d => d.StateName, o => o.MapFrom(s => s.State != null ? s.State.StateName : null));

        CreateMap<Airport, AirportResponse>();

        CreateMap<CarType, CarTypeResponse>()
            .ForMember(d => d.CarClass, o => o.MapFrom(s => s.CarClass.ToString()))
            .ForMember(d => d.CarType, o => o.MapFrom(s => s.CarTypeName))
            .ForMember(d => d.DailyRate, o => o.MapFrom(s => s.DailyRate ?? 0))
            .ForMember(d => d.WeeklyRate, o => o.MapFrom(s => s.WeeklyRate ?? 0))
            .ForMember(d => d.MonthlyRate, o => o.MapFrom(s => s.MonthlyRate ?? 0))
            .ForMember(d => d.HubName, o => o.MapFrom(s => s.Hub != null ? s.Hub.HubName : null));

        CreateMap<Car, CarResponse>()
            .ForMember(d => d.Status, o => o.MapFrom(s => s.Status.ToString()))
            .ForMember(d => d.HubName, o => o.MapFrom(s => s.Hub != null ? s.Hub.HubName : null));

        CreateMap<Addon, AddonResponse>();

        CreateMap<Staff, StaffResponse>()
            .ForMember(d => d.HubName, o => o.MapFrom(s => s.Hub != null ? s.Hub.HubName : null));

        CreateMap<Customer, ProfileResponse>()
            .ForMember(d => d.DocumentType,
                o => o.MapFrom(s => s.DocumentType.HasValue ? s.DocumentType.ToString() : null))
            .ForMember(d => d.CityName, o => o.MapFrom(s => s.City != null ? s.City.CityName : null))
            .ForMember(d => d.StateName, o => o.MapFrom(s => s.State != null ? s.State.StateName : null));

        // ── Bookings ────────────────────────────────────────────────────
        CreateMap<BookingHeader, BookingResponse>()
            .ForMember(d => d.BookingStatus, o => o.MapFrom(s => s.BookingStatus.ToString()))
            .ForMember(d => d.BookingDate, o => o.MapFrom(s => s.Date))
            .ForMember(d => d.CustomerName,
                o => o.MapFrom(s => (s.FirstName + " " + (s.LastName ?? "")).Trim()))
            .ForMember(d => d.VehicleAmount, o => o.MapFrom(s => s.VehicleAmount ?? 0m))
            .ForMember(d => d.AddonAmount, o => o.MapFrom(s => s.AddonAmount ?? 0m))
            .ForMember(d => d.TaxAmount, o => o.MapFrom(s => s.TaxAmount ?? 0m))
            .ForMember(d => d.GrandTotal, o => o.MapFrom(s => s.GrandTotal ?? 0m))
            // Filled in by the service - they need the caller's hub, and a
            // mapping profile has no business knowing who is logged in.
            .ForMember(d => d.CarTypeName, o => o.Ignore())
            .ForMember(d => d.CarClass, o => o.Ignore())
            .ForMember(d => d.CarTypeImageUrl, o => o.Ignore())
            .ForMember(d => d.CityName, o => o.Ignore())
            .ForMember(d => d.StateName, o => o.Ignore())
            .ForMember(d => d.Addons, o => o.Ignore())
            .ForMember(d => d.PickupHub, o => o.Ignore())
            .ForMember(d => d.DropoffHub, o => o.Ignore());

        CreateMap<BookingDetail, BookingAddonResponse>();

        CreateMap<InvoiceHeader, InvoiceResponse>()
            .ForMember(d => d.CustomerName,
                o => o.MapFrom(s => (s.FirstName + " " + (s.LastName ?? "")).Trim()))
            .ForMember(d => d.VehicleAmount, o => o.MapFrom(s => s.VehicleAmount ?? 0m))
            .ForMember(d => d.AddonAmount, o => o.MapFrom(s => s.AddonAmount ?? 0m))
            .ForMember(d => d.TaxAmount, o => o.MapFrom(s => s.TaxAmount ?? 0m))
            .ForMember(d => d.GrandTotal, o => o.MapFrom(s => s.GrandTotal ?? 0m))
            // What the customer actually pays once fuel is settled.
            .ForMember(d => d.FinalAmount,
                o => o.MapFrom(s => (s.GrandTotal ?? 0m) + (s.FuelCharges ?? 0m)))
            .ForMember(d => d.CarTypeName, o => o.Ignore())
            .ForMember(d => d.Addons, o => o.Ignore());

        CreateMap<InvoiceDetail, InvoiceAddonResponse>();

        // ── Requests -> entities ────────────────────────────────────────
        // Only the fields a caller is allowed to set. Everything financial is
        // computed server-side, so it is deliberately absent here.
        CreateMap<StaffRegisterRequest, Staff>()
            .ForMember(d => d.Id, o => o.Ignore())
            .ForMember(d => d.PasswordHash, o => o.Ignore())
            .ForMember(d => d.Hub, o => o.Ignore());

        // Null members are skipped so a partial update leaves untouched
        // fields alone instead of nulling them.
        CreateMap<UpdateStaffRequest, Staff>()
            .ForAllMembers(o => o.Condition((src, dest, member) => member != null));

        CreateMap<UpdateCustomerRequest, Customer>()
            .ForMember(d => d.DocumentType, o => o.Ignore())
            .ForAllMembers(o => o.Condition((src, dest, member) => member != null));
    }
}
