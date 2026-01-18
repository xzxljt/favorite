import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSnow, Wind } from 'lucide-react';
import { WeatherConfig } from '../types';

interface QWeatherNowResponse {
  code: string;
  now?: {
    temp?: string;
    text?: string;
    humidity?: string;
    windDir?: string;
  };
}

interface QWeatherAirResponse {
  code: string;
  now?: {
    aqi?: string;
    category?: string;
  };
}

interface WeatherData {
  temperature: string;
  weatherText: string;
  humidity: string;
  airQuality: string;
  locationLabel: string;
  unitLabel: string;
}

interface WeatherDisplayProps {
  config?: WeatherConfig;
}

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ config }) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  // 天气图标映射
  const getWeatherIcon = (weather: string) => {
    // 根据天气描述返回相应图标
    const weatherLower = weather.toLowerCase();
    if (weatherLower.includes('晴') || weatherLower.includes('sunny')) {
      return <Sun className="w-4 h-4 text-yellow-500" />;
    } else if (weatherLower.includes('云') || weatherLower.includes('cloud')) {
      return <Cloud className="w-4 h-4 text-gray-500" />;
    } else if (weatherLower.includes('雨') || weatherLower.includes('rain')) {
      return <CloudRain className="w-4 h-4 text-blue-500" />;
    } else if (weatherLower.includes('雪') || weatherLower.includes('snow')) {
      return <CloudSnow className="w-4 h-4 text-blue-300" />;
    } else if (weatherLower.includes('风') || weatherLower.includes('wind')) {
      return <Wind className="w-4 h-4 text-gray-600" />;
    } else {
      return <Sun className="w-4 h-4 text-yellow-500" />; // 默认图标
    }
  };

  // 获取天气数据
  useEffect(() => {
    if (!config || !config.enabled) {
      return;
    }

    const fetchWeather = async () => {
      setLoading(true);
      setError(null);

      try {
        if (!config.apiHost || !config.apiKey || !config.location) {
          setError('天气配置不完整');
          setWeatherData(null);
          return;
        }

        const normalizedHost = config.apiHost.startsWith('http')
          ? config.apiHost
          : `https://${config.apiHost}`;
        const params = new URLSearchParams({
          location: config.location,
          key: config.apiKey,
        });

        const [weatherResponse, airResponse] = await Promise.all([
          fetch(`${normalizedHost}/v7/weather/now?${params.toString()}`),
          fetch(`${normalizedHost}/v7/air/now?${params.toString()}`),
        ]);

        if (!weatherResponse.ok) {
          throw new Error(`QWeather API error: ${weatherResponse.status}`);
        }

        const weatherJson: QWeatherNowResponse = await weatherResponse.json();
        const airJson: QWeatherAirResponse | null = airResponse.ok ? await airResponse.json() : null;

        if (weatherJson.code !== '200') {
          setError('获取天气数据失败');
          setWeatherData(null);
          return;
        }

        const tempValue = parseFloat(weatherJson.now?.temp ?? '');
        const isFahrenheit = config.unit === 'fahrenheit';
        const temperature = Number.isFinite(tempValue)
          ? Math.round(isFahrenheit ? tempValue * 9 / 5 + 32 : tempValue).toString()
          : '--';

        setWeatherData({
          temperature,
          weatherText: weatherJson.now?.text ?? '未知',
          humidity: weatherJson.now?.humidity ?? '--',
          airQuality: airJson?.now?.aqi ?? '--',
          locationLabel: config.location,
          unitLabel: isFahrenheit ? '°F' : '°C',
        });
      } catch (err) {
        console.error('Failed to fetch weather from QWeather:', err);
        setError('天气数据获取失败');
        setWeatherData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();

    // 每10分钟更新一次天气数据
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [config]);

  // 如果没有配置或禁用了，则不显示组件
  if (!config || !config.enabled) {
    return null;
  }

  if (loading) {
    return (
      <div className="hidden xl:flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/30 rounded-full text-xs text-slate-500 dark:text-slate-400 h-[36px] min-w-[40px] leading-none">
        <Cloud className="w-4 h-4 animate-pulse" />
        <span className="hidden 2xl:inline">加载天气中...</span>
      </div>
    );
  }

  if (error || !weatherData) {
    return (
      <div className="hidden xl:flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/30 rounded-full text-xs text-slate-500 dark:text-slate-400 h-[36px] min-w-[40px] leading-none">
        <Cloud className="w-4 h-4" />
        <span className="hidden 2xl:inline">天气不可用</span>
      </div>
    );
  }

  const currentWeather = weatherData;
  const locationLabel = currentWeather.locationLabel.trim() || '未知位置';

  return (
    <div
      className="hidden xl:flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/30 rounded-full text-xs relative h-[36px] min-w-[40px] leading-none group"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {getWeatherIcon(currentWeather.weatherText)}
      <span className="font-medium text-slate-700 dark:text-slate-300">
        {currentWeather.temperature}{currentWeather.unitLabel}
      </span>
      <span className="text-slate-500 dark:text-slate-400 hidden 2xl:inline">
        {currentWeather.weatherText}
      </span>

      {/* Tooltip - 只在hover时显示城市信息 */}
      {isHovering && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 dark:bg-slate-600 text-white text-xs rounded whitespace-nowrap z-50">
          <div className="relative">
            {locationLabel}
            {/* Tooltip箭头 - 指向上方 */}
            <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-b-slate-800 dark:border-b-slate-600"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeatherDisplay;
