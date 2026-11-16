using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace FleetManagement.Service;

public interface ITokenService
{
    string CreateCustomerToken(string customerId, string email);
    string CreateStaffToken(int staffId, string email, int hubId);
}
