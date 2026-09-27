using Scalar.AspNetCore;
using AppositionBackend.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();

builder.Services.AddHttpClient<ItunesService>();

builder.Services.AddHttpClient<PythonService>(client =>
{
    client.BaseAddress = new Uri("http://localhost:8000");
    // Embedding, five review feeds and two Gemini calls can outlast the 100 s default.
    client.Timeout = TimeSpan.FromMinutes(3);
});


// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();

    app.MapGet("/", () => Results.Redirect("/scalar/v1"));
}

app.UseHttpsRedirection();

app.MapControllers();

app.Run();
